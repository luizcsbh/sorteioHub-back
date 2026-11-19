import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/audit.js';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { isValidCpf, cleanCpf, maskCpf } from '../../utils/cpf.js';
import { hashCpf, encryptCpf } from '../../utils/crypto.js';

export class RafflesService {
  static async createRaffle(userId: string, role: Role, data: any, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: data.groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Acesso negado. Apenas o administrador do grupo pode criar sorteios nele.');
    }

    const start = new Date(data.participationStartDate);
    const end = new Date(data.participationEndDate);
    const draw = new Date(data.drawDateTime);

    if (start >= end) {
      throw new Error('A data de início deve ser anterior à data de término da participação.');
    }
    if (end > draw) {
      throw new Error('A data do sorteio deve ser posterior ao término da participação.');
    }

    const raffle = await prisma.raffle.create({
      data: {
        groupId: data.groupId,
        title: data.title,
        description: data.description,
        prize: data.prize,
        rules: data.rules,
        winnerInstructions: data.winnerInstructions,
        visibility: data.visibility || 'RESTRITO_A_GRUPO',
        maxEntriesPerPerson: data.maxEntriesPerPerson || 1,
        numberOfWinners: data.numberOfWinners || 1,
        participationStartDate: start,
        participationEndDate: end,
        drawDateTime: draw,
        legalAuthorizationCode: data.legalAuthorizationCode,
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_CREATED',
      entity: 'Raffle',
      entityId: raffle.id,
      details: { title: raffle.title, groupId: raffle.groupId },
    });

    return raffle;
  }

  static async updateRaffle(raffleId: string, userId: string, role: Role, data: any, req?: Request) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: { group: true },
    });
    if (!raffle) throw new Error('Sorteio não encontrado.');

    if (raffle.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o administrador do grupo ou Super Admin pode editar este sorteio.');
    }

    if (raffle.status === 'DRAWN') {
      throw new Error('Não é possível editar um sorteio que já foi realizado.');
    }

    const updated = await prisma.raffle.update({
      where: { id: raffleId },
      data,
    });

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_UPDATED',
      entity: 'Raffle',
      entityId: raffleId,
      details: data,
    });

    return updated;
  }

  static async publishRaffle(raffleId: string, userId: string, role: Role, req?: Request) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        group: {
          include: {
            members: {
              where: { status: 'ATIVO' },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!raffle) throw new Error('Sorteio não encontrado.');

    if (raffle.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo pode publicar o sorteio.');
    }

    if (raffle.status !== 'DRAFT') {
      throw new Error(`O sorteio não pode ser publicado no status atual (${raffle.status}).`);
    }

    const published = await prisma.raffle.update({
      where: { id: raffleId },
      data: { status: 'PUBLISHED' },
    });

    // Notifica todos os membros ativos do grupo
    for (const member of raffle.group.members) {
      if (member.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            title: `Novo Sorteio Publicado: ${raffle.title}`,
            message: `O grupo "${raffle.group.name}" publicou um novo sorteio com prêmio: "${raffle.prize}". Participe agora!`,
            actionUrl: `/raffles/${raffleId}`,
          },
        });
      }
    }

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_PUBLISHED',
      entity: 'Raffle',
      entityId: raffleId,
    });

    return published;
  }

  static async cancelRaffle(raffleId: string, userId: string, role: Role, reason: string, req?: Request) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: { group: true },
    });
    if (!raffle) throw new Error('Sorteio não encontrado.');

    if (raffle.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo ou Super Admin pode cancelar o sorteio.');
    }

    if (raffle.status === 'DRAWN') {
      throw new Error('Sorteios já realizados não podem ser cancelados.');
    }

    const cancelled = await prisma.raffle.update({
      where: { id: raffleId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || 'Cancelado pelo administrador.',
      },
      include: {
        participants: { select: { userId: true } },
      },
    });

    // Notifica os participantes sobre o cancelamento
    for (const p of cancelled.participants) {
      await prisma.notification.create({
        data: {
          userId: p.userId,
          title: `Sorteio Cancelado: ${raffle.title}`,
          message: `O sorteio "${raffle.title}" foi cancelado. Motivo: ${reason || 'Não informado.'}`,
          actionUrl: `/raffles/${raffleId}`,
        },
      });
    }

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_CANCELLED',
      entity: 'Raffle',
      entityId: raffleId,
      details: { reason },
    });

    return cancelled;
  }

  static async deleteRaffle(raffleId: string, userId: string, role: Role, req?: Request) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        group: true,
        _count: { select: { participants: true } },
      },
    });
    if (!raffle) throw new Error('Sorteio não encontrado.');

    if (raffle.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Acesso negado.');
    }

    if (raffle.status === 'DRAWN') {
      throw new Error('Sorteios realizados possuem registro de auditoria e não podem ser excluídos.');
    }

    if (raffle._count.participants > 0) {
      throw new Error('Sorteio possui participantes inscritos. Cancele o sorteio com justificativa em vez de excluir.');
    }

    await prisma.raffle.delete({ where: { id: raffleId } });

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_DELETED',
      entity: 'Raffle',
      entityId: raffleId,
    });

    return { message: 'Sorteio excluído com sucesso.' };
  }

  static async listRaffles(userId: string, role: Role, filter?: string) {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    // Condição de pertinência a grupos
    const groupFilter = isSuperAdmin
      ? {}
      : {
          group: {
            OR: [
              { managerId: userId },
              { members: { some: { userId, status: 'ATIVO' as const } } },
            ],
          },
        };

    const statusCondition: any = {};
    const now = new Date();

    if (filter === 'em_andamento') {
      statusCondition.status = 'PUBLISHED';
      statusCondition.participationEndDate = { gte: now };
    } else if (filter === 'encerrados') {
      statusCondition.OR = [
        { status: 'PUBLISHED', participationEndDate: { lt: now } },
        { status: 'DRAWN' },
        { status: 'CANCELLED' },
      ];
    } else if (filter === 'sorteados') {
      statusCondition.status = 'DRAWN';
    } else if (filter === 'ganhadores') {
      // Sorteios em que o usuário foi contemplado
      return prisma.raffle.findMany({
        where: {
          winners: { some: { userId } },
        },
        include: {
          group: { select: { id: true, name: true } },
          winners: {
            where: { userId },
            select: { rankPosition: true, status: true, instructionsSent: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return prisma.raffle.findMany({
      where: {
        ...groupFilter,
        ...statusCondition,
      },
      include: {
        group: { select: { id: true, name: true, managerId: true } },
        participants: {
          where: { userId },
          select: { id: true, ticketCode: true, confirmedAt: true },
        },
        winners: {
          select: {
            rankPosition: true,
            status: true,
            user: { select: { id: true, name: true } },
          },
        },
        _count: { select: { participants: true, winners: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRaffleById(raffleId: string, userId: string, role: Role) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
              select: { status: true },
            },
          },
        },
        participants: {
          where: { userId },
          select: { id: true, ticketCode: true, confirmedAt: true },
        },
        _count: { select: { participants: true, winners: true } },
      },
    });

    if (!raffle) throw new Error('Sorteio não encontrado.');

    const isManager = raffle.group.managerId === userId;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isMember = raffle.group.members.some((m) => m.status === 'ATIVO');

    if (!isManager && !isSuperAdmin && !isMember) {
      throw new Error('Acesso negado. Você não é membro autorizado do grupo deste sorteio.');
    }

    return {
      ...raffle,
      hasParticipated: raffle.participants.length > 0,
      userParticipation: raffle.participants[0] || null,
      isManager: isManager || isSuperAdmin,
    };
  }

  static async getPublicRaffle(identifier: string) {
    const cleanId = identifier.trim().toLowerCase();
    let raffle = await prisma.raffle.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        title: true,
        description: true,
        prize: true,
        rules: true,
        winnerInstructions: true,
        drawDateTime: true,
        participationStartDate: true,
        participationEndDate: true,
        status: true,
        visibility: true,
        group: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!raffle && cleanId.length >= 4) {
      raffle = await prisma.raffle.findFirst({
        where: {
          id: { startsWith: cleanId },
        },
        select: {
          id: true,
          title: true,
          description: true,
          prize: true,
          rules: true,
          winnerInstructions: true,
          drawDateTime: true,
          participationStartDate: true,
          participationEndDate: true,
          status: true,
          visibility: true,
          group: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              description: true,
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });
    }

    if (!raffle) {
      throw new Error('Sorteio não encontrado com o PIN ou link informado.');
    }

    return raffle;
  }

  static async participate(raffleId: string, userId: string, req?: Request, bodyCpf?: string) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!raffle) throw new Error('Sorteio não encontrado.');

    // 1. Auto-associa ou valida o usuário como membro ativo do grupo (fluxo de link/PIN direto)
    let membership = raffle.group.members[0];
    if (!membership) {
      membership = await prisma.groupMember.create({
        data: {
          groupId: raffle.groupId,
          userId,
          status: 'ATIVO',
          joinedAt: new Date(),
        },
      });
    } else if (membership.status !== 'ATIVO') {
      membership = await prisma.groupMember.update({
        where: { id: membership.id },
        data: { status: 'ATIVO', joinedAt: new Date() },
      });
    }

    // 2. Valida se usuário tem CPF validado ou valida na hora via bodyCpf
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuário não encontrado.');

    if (!user.isCpfValidated) {
      if (bodyCpf && isValidCpf(bodyCpf)) {
        const cleaned = cleanCpf(bodyCpf);
        const hashed = hashCpf(cleaned);
        const existingCpf = await prisma.user.findFirst({
          where: { cpfHash: hashed, NOT: { id: userId } },
        });
        if (existingCpf) {
          throw new Error('Este CPF já está cadastrado em outra conta.');
        }
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            cpfHash: hashed,
            cpfEncrypted: encryptCpf(cleaned),
            cpfMasked: maskCpf(bodyCpf),
            isCpfValidated: true,
          },
        });
      } else {
        throw new Error('É obrigatório ter o CPF cadastrado e validado para participar.');
      }
    }

    // 3. Valida se sorteio está aberto
    if (raffle.status !== 'PUBLISHED') {
      throw new Error('Este sorteio não está aberto para participações no momento.');
    }

    // 4. Valida período de participação
    const now = new Date();
    if (now < raffle.participationStartDate) {
      throw new Error('O período de inscrições para este sorteio ainda não foi iniciado.');
    }
    if (now > raffle.participationEndDate) {
      throw new Error('O período de inscrições para este sorteio já foi encerrado.');
    }

    // 5. Valida duplicidade
    const existingParticipation = await prisma.raffleParticipant.findUnique({
      where: {
        raffleId_userId: {
          raffleId,
          userId,
        },
      },
    });

    if (existingParticipation) {
      throw new Error('Você já está inscrito e participando deste sorteio.');
    }

    // 6. Registra participação e aceite do regulamento
    const participation = await prisma.$transaction(async (tx) => {
      const p = await tx.raffleParticipant.create({
        data: {
          raffleId,
          userId,
        },
      });

      // Registra aceite do regulamento do sorteio
      await tx.termsAcceptance.create({
        data: {
          userId,
          termType: `RAFFLE_RULES_${raffleId}`,
          version: '1.0',
          ipAddress: req?.ip || req?.socket.remoteAddress,
          userAgent: req?.headers['user-agent'],
        },
      });

      return p;
    });

    await logAudit({
      req,
      userId,
      action: 'RAFFLE_PARTICIPATION_CONFIRMED',
      entity: 'RaffleParticipant',
      entityId: participation.id,
      details: { raffleId, ticketCode: participation.ticketCode },
    });

    return {
      message: 'Participação confirmada com sucesso! Boa sorte!',
      ticketCode: participation.ticketCode,
      confirmedAt: participation.confirmedAt,
    };
  }

  static async getResults(raffleId: string, userId: string, role: Role) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        draws: {
          include: {
            evidence: {
              select: {
                algorithm: true,
                seed: true,
                createdAt: true,
              },
            },
          },
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
        winners: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                cpfMasked: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { rankPosition: 'asc' },
        },
      },
    });

    if (!raffle) throw new Error('Sorteio não encontrado.');

    const isManager = raffle.group.managerId === userId || role === 'SUPER_ADMIN';
    const isMember = raffle.group.members.some((m) => m.status === 'ATIVO');

    if (!isManager && !isMember) {
      throw new Error('Acesso negado aos resultados deste sorteio.');
    }

    const draw = raffle.draws[0] || null;

    // Mascara nome dos ganhadores para proteção adicional (exibe: João S****)
    const sanitizedWinners = raffle.winners.map((w) => {
      const isCurrentUser = w.userId === userId;
      const nameParts = w.user.name.split(' ');
      const maskedName =
        nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[1].charAt(0)}****`
          : `${nameParts[0].charAt(0)}****`;

      return {
        id: w.id,
        rankPosition: w.rankPosition,
        name: isManager || isCurrentUser ? w.user.name : maskedName,
        cpfMasked: w.user.cpfMasked || '***.***.***-**',
        status: w.status,
        isYou: isCurrentUser,
        // Somente o próprio ganhador e o administrador veem as instruções de resgate
        instructions: isManager || isCurrentUser ? w.instructionsSent : null,
      };
    });

    return {
      raffle: {
        id: raffle.id,
        title: raffle.title,
        prize: raffle.prize,
        status: raffle.status,
        drawDateTime: raffle.drawDateTime,
      },
      draw: draw
        ? {
            id: draw.id,
            executedAt: draw.executedAt,
            totalEligible: draw.totalEligible,
            participantsHash: draw.participantsHash,
            algorithm: draw.evidence?.algorithm,
          }
        : null,
      winners: sanitizedWinners,
    };
  }
}
