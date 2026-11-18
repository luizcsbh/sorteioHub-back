import prisma from '../../config/prisma.js';
import { Role } from '@prisma/client';

export class AdminService {
  static async getDashboard(userId: string, role: Role) {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    // Se for SuperAdmin, vê totais globais; se for Administrador, vê os seus grupos e sorteios
    const groupWhere = isSuperAdmin ? {} : { managerId: userId };
    const raffleWhere = isSuperAdmin ? {} : { group: { managerId: userId } };
    const memberWhere = isSuperAdmin ? {} : { group: { managerId: userId } };

    const [
      totalUsers,
      totalGroups,
      activeMembers,
      totalRaffles,
      activeRaffles,
      finishedRaffles,
      totalParticipations,
      totalWinners,
      totalNotifications,
      failedNotifications,
    ] = await Promise.all([
      isSuperAdmin ? prisma.user.count() : prisma.groupMember.count({ where: { group: { managerId: userId }, status: 'ATIVO' } }),
      prisma.group.count({ where: groupWhere }),
      prisma.groupMember.count({ where: { ...memberWhere, status: 'ATIVO' } }),
      prisma.raffle.count({ where: raffleWhere }),
      prisma.raffle.count({ where: { ...raffleWhere, status: 'PUBLISHED' } }),
      prisma.raffle.count({ where: { ...raffleWhere, status: 'DRAWN' } }),
      prisma.raffleParticipant.count({ where: isSuperAdmin ? {} : { raffle: { group: { managerId: userId } } } }),
      prisma.winner.count({ where: isSuperAdmin ? {} : { raffle: { group: { managerId: userId } } } }),
      prisma.notification.count({ where: isSuperAdmin ? {} : { user: { memberships: { some: { group: { managerId: userId } } } } } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
    ]);

    // Últimas atividades recentes para visualização imediata
    const recentDraws = await prisma.draw.findMany({
      where: isSuperAdmin ? {} : { raffle: { group: { managerId: userId } } },
      include: {
        raffle: { select: { title: true, prize: true } },
        winners: {
          include: {
            user: { select: { name: true, cpfMasked: true } },
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 5,
    });

    return {
      indicators: {
        totalUsers,
        totalGroups,
        activeMembers,
        totalRaffles,
        activeRaffles,
        finishedRaffles,
        totalParticipations,
        totalWinners,
        totalNotifications,
        failedNotifications,
      },
      recentDraws,
    };
  }

  static async getReports(userId: string, role: Role, type?: string) {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    // 1. Participantes por grupo
    const participantsByGroup = await prisma.group.findMany({
      where: isSuperAdmin ? {} : { managerId: userId },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            members: true,
            raffles: true,
            invitations: true,
          },
        },
      },
    });

    // 2. Participantes por sorteio e taxa de participação
    const participantsByRaffle = await prisma.raffle.findMany({
      where: isSuperAdmin ? {} : { group: { managerId: userId } },
      select: {
        id: true,
        title: true,
        status: true,
        drawDateTime: true,
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 3. Ganhadores recentes
    const winnersReport = await prisma.winner.findMany({
      where: isSuperAdmin ? {} : { raffle: { group: { managerId: userId } } },
      include: {
        raffle: { select: { title: true, prize: true } },
        user: { select: { id: true, name: true, email: true, cpfMasked: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 4. Taxa de aceitação de convites
    const invitations = await prisma.groupInvitation.findMany({
      where: isSuperAdmin ? {} : { group: { managerId: userId } },
      select: {
        id: true,
        type: true,
        maxUses: true,
        currentUses: true,
        isRevoked: true,
        expiresAt: true,
        createdAt: true,
        group: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 5. Auditoria recente
    const recentAudit = await prisma.auditLog.findMany({
      where: isSuperAdmin ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return {
      participantsByGroup,
      participantsByRaffle,
      winnersReport,
      invitations,
      recentAudit,
    };
  }
}
