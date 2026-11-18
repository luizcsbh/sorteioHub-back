import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { secureRandomInt, generateHash } from '../../utils/crypto.js';
import { logAudit } from '../../utils/audit.js';
import { EmailService } from '../../services/email.service.js';
import { Request } from 'express';

export interface DrawExecutionResult {
  drawId: string;
  raffleId: string;
  totalEligible: number;
  participantsHash: string;
  executedAt: Date;
  winners: Array<{
    userId: string;
    userName: string;
    userEmailMasked: string;
    rankPosition: number;
  }>;
}

export class DrawEngine {
  /**
   * Executa o sorteio com garantias criptográficas e auditoria imutável
   */
  static async executeDraw(
    raffleId: string,
    executedById: string,
    req?: Request
  ): Promise<DrawExecutionResult> {
    // Transação serializável ou com lock de concorrência
    return prisma.$transaction(async (tx) => {
      // 1. Carrega o sorteio e valida o status
      const raffle = await tx.raffle.findUnique({
        where: { id: raffleId },
        include: {
          group: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!raffle) {
        throw new Error('Sorteio não encontrado.');
      }

      if (raffle.status === 'DRAWING') {
        throw new Error('O sorteio já está em processo de execução simultânea.');
      }

      if (raffle.status === 'DRAWN') {
        throw new Error('Este sorteio já foi realizado anteriormente.');
      }

      if (raffle.status === 'CANCELLED') {
        throw new Error('Este sorteio foi cancelado e não pode ser realizado.');
      }

      // 2. Coloca em status DRAWING para bloquear concorrência
      await tx.raffle.update({
        where: { id: raffleId },
        data: { status: 'DRAWING' },
      });

      // 3. Filtra e valida participantes elegíveis:
      // Devem ser membros ATIVOS do grupo no momento do sorteio com CPF validado
      const activeMembers = await tx.groupMember.findMany({
        where: {
          groupId: raffle.groupId,
          status: 'ATIVO',
        },
        select: { userId: true },
      });

      const activeMemberIds = new Set(activeMembers.map((m) => m.userId));

      const eligibleParticipants = raffle.participants.filter(
        (p) => activeMemberIds.has(p.userId) && p.user.isCpfValidated
      );

      if (eligibleParticipants.length === 0) {
        // Restaura status para PUBLISHED caso não haja participantes
        await tx.raffle.update({
          where: { id: raffleId },
          data: { status: 'PUBLISHED' },
        });
        throw new Error('Não há participantes elegíveis para realizar o sorteio.');
      }

      const winnersCountToSelect = Math.min(raffle.numberOfWinners, eligibleParticipants.length);

      // 4. Criação da Semente e Snapshot Determinístico dos Participantes
      // Ordena por ID para garantir consistência e reprodutibilidade do hash
      const sortedParticipantIds = eligibleParticipants
        .map((p) => p.userId)
        .sort();

      const serializedPool = JSON.stringify(sortedParticipantIds);
      const participantsHash = generateHash(serializedPool);
      const seed = crypto.randomBytes(32).toString('hex');
      const drawId = crypto.randomUUID();

      // 5. Algoritmo Criptograficamente Seguro de Seleção Uniforme Sem Reposição
      // Utiliza Fisher-Yates shuffle com crypto.randomInt
      const pool = [...eligibleParticipants];
      const selectedWinners: typeof eligibleParticipants = [];
      const drawLogs: string[] = [];

      for (let i = 0; i < winnersCountToSelect; i++) {
        // crypto.randomInt é uniforme e sem viés: [0, pool.length)
        const chosenIndex = secureRandomInt(0, pool.length);
        const chosen = pool.splice(chosenIndex, 1)[0];
        selectedWinners.push(chosen);

        drawLogs.push(
          `Posição #${i + 1}: Participante ${chosen.userId} sorteado no índice [${chosenIndex} de ${pool.length + 1} disponíveis].`
        );
      }

      // 6. Persiste a Execução do Sorteio
      const draw = await tx.draw.create({
        data: {
          id: drawId,
          raffleId,
          executedById,
          totalEligible: eligibleParticipants.length,
          participantsHash,
        },
      });

      // 7. Persiste Evidências Criptográficas e Imutáveis
      await tx.drawEvidence.create({
        data: {
          drawId: draw.id,
          seed,
          algorithm: 'Node.js crypto.randomInt (Fisher-Yates Criptográfico Seguro)',
          rawEligibleIds: serializedPool,
          drawLog: JSON.stringify(drawLogs),
        },
      });

      // 8. Cadastra os Ganhadores
      const winnersData = [];
      for (let rank = 0; rank < selectedWinners.length; rank++) {
        const winnerParticipant = selectedWinners[rank];
        const winner = await tx.winner.create({
          data: {
            raffleId,
            drawId: draw.id,
            userId: winnerParticipant.userId,
            rankPosition: rank + 1,
            status: 'PENDING_CONFIRMATION',
            instructionsSent: raffle.winnerInstructions || 'Entre em contato com o administrador do grupo para entrega do prêmio.',
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        // Notificação individual ao ganhador
        await tx.notification.create({
          data: {
            userId: winner.userId,
            title: `🎉 Parabéns! Você foi contemplado no sorteio "${raffle.title}"!`,
            message: `Você conquistou o prêmio: "${raffle.prize}". Siga as instruções do administrador para retirada.`,
            actionUrl: `/raffles/${raffleId}/results`,
          },
        });

        const [emailUser, emailDomain] = winner.user.email.split('@');
        const maskedEmail = `${emailUser.charAt(0)}***${emailUser.slice(-1)}@${emailDomain}`;

        winnersData.push({
          userId: winner.userId,
          userName: winner.user.name,
          userEmailMasked: maskedEmail,
          rankPosition: winner.rankPosition,
        });
      }

      // 9. Notificação geral a todos os outros participantes informando que o sorteio foi realizado
      const nonWinningParticipants = eligibleParticipants.filter(
        (p) => !selectedWinners.some((w) => w.userId === p.userId)
      );

      for (const nonWinner of nonWinningParticipants) {
        await tx.notification.create({
          data: {
            userId: nonWinner.userId,
            title: `Sorteio "${raffle.title}" Realizado`,
            message: `O sorteio foi concluído. Confira os resultados oficiais e o ganhador no painel.`,
            actionUrl: `/raffles/${raffleId}/results`,
          },
        });
      }

      // 10. Atualiza o status do sorteio para DRAWN
      await tx.raffle.update({
        where: { id: raffleId },
        data: { status: 'DRAWN' },
      });

      // Dispara e-mails via Mailtrap de forma assíncrona
      for (const w of selectedWinners) {
        EmailService.sendWinnerNotification(
          w.user.email,
          w.user.name,
          raffle.title,
          raffle.prize,
          raffle.winnerInstructions
        ).catch((err) => console.error('[Mailtrap] Erro envio ganhador:', err));
      }

      for (const nw of nonWinningParticipants) {
        EmailService.sendRaffleFinishedNotification(
          nw.user.email,
          nw.user.name,
          raffle.title,
          raffle.prize
        ).catch((err) => console.error('[Mailtrap] Erro envio participante:', err));
      }

      await logAudit({
        req,
        userId: executedById,
        action: 'DRAW_EXECUTED',
        entity: 'Draw',
        entityId: draw.id,
        details: {
          raffleId,
          totalEligible: eligibleParticipants.length,
          participantsHash,
          winnersCount: winnersData.length,
        },
      });

      return {
        drawId: draw.id,
        raffleId,
        totalEligible: eligibleParticipants.length,
        participantsHash,
        executedAt: draw.executedAt,
        winners: winnersData,
      };
    });
  }
}
