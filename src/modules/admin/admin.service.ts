import prisma from '../../config/prisma.js';
import { Role } from '@prisma/client';
import { logAudit } from '../../utils/audit.js';

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
      orderBy: { createdAt: 'desc' },
      take: 200,
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
      take: 200,
    });

    // 3. Ganhadores recentes
    const winnersReport = await prisma.winner.findMany({
      where: isSuperAdmin ? {} : { raffle: { group: { managerId: userId } } },
      include: {
        raffle: { select: { title: true, prize: true } },
        user: { select: { id: true, name: true, email: true, cpfMasked: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
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
      take: 200,
    });

    // 5. Auditoria recente
    const recentAudit = await prisma.auditLog.findMany({
      where: isSuperAdmin ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      participantsByGroup,
      participantsByRaffle,
      winnersReport,
      invitations,
      recentAudit,
    };
  }

  static async getAuditLogs(
    userId: string,
    role: Role,
    page: number = 1,
    limit: number = 10,
    search?: string,
    actionFilter?: string
  ) {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const where: any = isSuperAdmin ? {} : { userId };

    if (actionFilter && actionFilter !== 'ALL') {
      where.action = actionFilter;
    }

    if (search && search.trim()) {
      where.OR = [
        { action: { contains: search.trim(), mode: 'insensitive' } },
        { entity: { contains: search.trim(), mode: 'insensitive' } },
        { entityId: { contains: search.trim(), mode: 'insensitive' } },
        { details: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  static async getUsers(
    search?: string,
    roleFilter?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const where: any = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (roleFilter && ['SUPER_ADMIN', 'ADMINISTRATOR', 'PARTICIPANT'].includes(roleFilter)) {
      where.role = roleFilter;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          cpfMasked: true,
          phone: true,
          isCpfValidated: true,
          createdAt: true,
          _count: {
            select: {
              memberships: true,
              managedGroups: true,
              raffleParticipations: true,
              wonPrizes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  static async updateUserRole(adminUserId: string, targetUserId: string, newRole: Role, req?: any) {
    if (!['SUPER_ADMIN', 'ADMINISTRATOR', 'PARTICIPANT'].includes(newRole)) {
      throw new Error('Papel de usuário inválido.');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new Error('Usuário não encontrado.');
    }

    // Se o usuário alvo for o único SUPER_ADMIN e estiver sendo rebaixado, impede
    if (targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdminCount <= 1) {
        throw new Error('Não é possível rebaixar o único Super Administrador da plataforma.');
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await logAudit({
      req,
      userId: adminUserId,
      action: 'USER_ROLE_UPDATED',
      entity: 'User',
      entityId: targetUserId,
      details: { previousRole: targetUser.role, newRole },
    });

    return updated;
  }
}
