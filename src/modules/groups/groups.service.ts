import prisma from '../../config/prisma.js';
import { generateSecureToken } from '../../utils/crypto.js';
import { logAudit } from '../../utils/audit.js';
import { EmailService } from '../../services/email.service.js';
import { Request } from 'express';
import { Role } from '@prisma/client';

export interface CreateGroupInput {
  name: string;
  description?: string;
  imageUrl?: string | null;
  maxMembers?: number | null;
  autoApprove?: boolean;
}

export interface CreateInvitationInput {
  type?: 'INDIVIDUAL_EMAIL' | 'TOKEN_LINK' | 'LIST_IMPORT';
  targetEmail?: string | null;
  maxUses?: number;
  expiresInDays?: number;
}

export class GroupsService {
  static async createGroup(userId: string, data: CreateGroupInput, req?: Request) {
    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        maxMembers: data.maxMembers,
        autoApprove: data.autoApprove ?? false,
        managerId: userId,
        members: {
          create: {
            userId,
            status: 'ATIVO',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logAudit({
      req,
      userId,
      action: 'GROUP_CREATED',
      entity: 'Group',
      entityId: group.id,
      details: { name: group.name },
    });

    return group;
  }

  static async listGroups(userId: string, role: Role) {
    if (role === 'SUPER_ADMIN') {
      return prisma.group.findMany({
        include: {
          manager: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true, raffles: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.group.findMany({
      where: {
        OR: [
          { managerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: {
          where: { userId },
          select: { status: true, joinedAt: true },
        },
        _count: { select: { members: true, raffles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getGroupById(groupId: string, userId: string, role: Role) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: {
          where: { userId },
          select: { status: true, joinedAt: true },
        },
        raffles: {
          where: {
            status: { not: 'DRAFT' },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { members: true, raffles: true } },
      },
    });

    if (!group) {
      throw new Error('Grupo não encontrado.');
    }

    const isManager = group.managerId === userId;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isMember = group.members.some((m) => m.status === 'ATIVO');

    if (!isManager && !isSuperAdmin && !isMember) {
      throw new Error('Acesso negado. Este é um grupo privado exclusivo para participantes autorizados.');
    }

    return group;
  }

  static async updateGroup(groupId: string, userId: string, role: Role, data: any, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Acesso negado. Apenas o administrador responsável pode alterar este grupo.');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data,
    });

    await logAudit({
      req,
      userId,
      action: 'GROUP_UPDATED',
      entity: 'Group',
      entityId: groupId,
      details: data,
    });

    return updated;
  }

  static async deleteOrArchiveGroup(groupId: string, userId: string, role: Role, req?: Request) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { raffles: true } } },
    });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo ou Super Admin pode excluir/arquivar o grupo.');
    }

    if (group._count.raffles > 0) {
      const archived = await prisma.group.update({
        where: { id: groupId },
        data: { status: 'ARQUIVADO' },
      });

      await logAudit({
        req,
        userId,
        action: 'GROUP_ARCHIVED',
        entity: 'Group',
        entityId: groupId,
        details: { reason: 'Possui sorteios vinculados; arquivado por integridade.' },
      });

      return { action: 'archived', group: archived };
    }

    await prisma.group.delete({ where: { id: groupId } });

    await logAudit({
      req,
      userId,
      action: 'GROUP_DELETED',
      entity: 'Group',
      entityId: groupId,
    });

    return { action: 'deleted' };
  }

  static async listGroupMembers(groupId: string, userId: string, role: Role) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo ou Super Admin pode visualizar a lista completa de membros.');
    }

    return prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            cpfMasked: true,
            isCpfValidated: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createInvitation(groupId: string, userId: string, data: CreateInvitationInput, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    const token = generateSecureToken(24);
    const days = data.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const invitation = await prisma.groupInvitation.create({
      data: {
        groupId,
        token,
        type: data.type || 'TOKEN_LINK',
        targetEmail: data.targetEmail,
        maxUses: data.maxUses ?? 1,
        expiresAt,
        createdById: userId,
      },
    });

    // Se convite direcionado a um e-mail específico, dispara pelo Mailtrap
    if (data.targetEmail) {
      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
      const manager = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      EmailService.sendGroupInvitationEmail(
        data.targetEmail,
        group.name,
        inviteUrl,
        manager?.name || 'Administrador'
      ).catch((err) => console.error('[Mailtrap] Erro envio convite:', err));
    }

    await logAudit({
      req,
      userId,
      action: 'GROUP_INVITATION_CREATED',
      entity: 'GroupInvitation',
      entityId: invitation.id,
      details: { groupId, type: invitation.type, maxUses: invitation.maxUses },
    });

    return invitation;
  }

  static async joinGroupWithToken(token: string, userId: string, req?: Request) {
    const invitation = await prisma.groupInvitation.findUnique({
      where: { token },
      include: { group: true },
    });

    if (!invitation) {
      throw new Error('Convite não encontrado ou inválido.');
    }

    if (invitation.isRevoked) {
      throw new Error('Este convite foi revogado pelo administrador.');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new Error('Este convite expirou.');
    }

    if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
      throw new Error('O limite máximo de utilizações deste convite foi atingido.');
    }

    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: invitation.groupId,
          userId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === 'ATIVO') {
        return { message: 'Você já é membro ativo deste grupo.', member: existingMembership };
      }
      if (existingMembership.status === 'PENDENTE') {
        return { message: 'Sua solicitação de entrada já está pendente de aprovação.', member: existingMembership };
      }
    }

    const autoApprove = invitation.group.autoApprove;
    const memberStatus = autoApprove ? 'ATIVO' : 'PENDENTE';

    const result = await prisma.$transaction(async (tx) => {
      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: { currentUses: { increment: 1 } },
      });

      const member = await tx.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId,
          },
        },
        create: {
          groupId: invitation.groupId,
          userId,
          status: memberStatus,
          joinedAt: autoApprove ? new Date() : null,
        },
        update: {
          status: memberStatus,
          joinedAt: autoApprove ? new Date() : null,
        },
      });

      if (!autoApprove) {
        await tx.notification.create({
          data: {
            userId: invitation.group.managerId,
            title: 'Nova solicitação de entrada no grupo',
            message: `Um participante solicitou entrada no grupo "${invitation.group.name}".`,
            actionUrl: `/groups/${invitation.groupId}/members`,
          },
        });
      }

      return member;
    });

    await logAudit({
      req,
      userId,
      action: 'GROUP_JOINED_VIA_TOKEN',
      entity: 'GroupMember',
      entityId: result.id,
      details: { groupId: invitation.groupId, autoApproved: autoApprove },
    });

    return {
      message: autoApprove
        ? 'Acesso liberado com sucesso! Você já pode participar dos sorteios deste grupo.'
        : 'Sua solicitação foi enviada e aguarda aprovação do administrador do grupo.',
      member: result,
      autoApproved: autoApprove,
    };
  }

  static async approveMember(groupId: string, targetUserId: string, managerId: string, role: Role, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== managerId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo ou Super Admin pode aprovar membros.');
    }

    const member = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
      data: {
        status: 'ATIVO',
        joinedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Sua entrada no grupo foi aprovada!',
        message: `Você agora é membro ativo do grupo "${group.name}". Aproveite para conferir os sorteios abertos!`,
        actionUrl: `/groups/${groupId}`,
      },
    });

    await logAudit({
      req,
      userId: managerId,
      action: 'GROUP_MEMBER_APPROVED',
      entity: 'GroupMember',
      entityId: member.id,
      details: { groupId, targetUserId },
    });

    return member;
  }

  static async removeMember(groupId: string, targetUserId: string, managerId: string, role: Role, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== managerId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo ou Super Admin pode remover membros.');
    }

    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
      data: {
        status: 'REMOVIDO',
      },
    });

    await logAudit({
      req,
      userId: managerId,
      action: 'GROUP_MEMBER_REMOVED',
      entity: 'GroupMember',
      details: { groupId, targetUserId },
    });

    return { message: 'Membro removido do grupo.' };
  }
}
