import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/audit.js';
import { EmailService } from '../../services/email.service.js';
import { Request } from 'express';
import { Role } from '@prisma/client';

export class CampaignsService {
  static async importContacts(
    contacts: Array<{ email: string; name?: string }>,
    userId: string,
    req?: Request
  ) {
    let imported = 0;
    let duplicates = 0;

    const seenEmails = new Set<string>();

    for (const c of contacts) {
      const email = c.email.toLowerCase().trim();
      if (seenEmails.has(email)) {
        duplicates++;
        continue;
      }
      seenEmails.add(email);

      // Upsert contato (respeita optOut prévio)
      await prisma.emailContact.upsert({
        where: { email },
        create: {
          email,
          name: c.name?.trim(),
          optOut: false,
        },
        update: {
          name: c.name?.trim() || undefined,
        },
      });

      imported++;
    }

    await logAudit({
      req,
      userId,
      action: 'CONTACTS_IMPORTED',
      entity: 'EmailContact',
      details: { totalReceived: contacts.length, imported, duplicates },
    });

    return {
      message: 'Lista de contatos importada com sucesso.',
      imported,
      duplicates,
      notice: 'Importar contatos não realiza cadastro de usuário nem participação em sorteios (LGPD).',
    };
  }

  static async createCampaign(userId: string, role: Role, data: any, req?: Request) {
    const group = await prisma.group.findUnique({ where: { id: data.groupId } });
    if (!group) throw new Error('Grupo não encontrado.');

    if (group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Apenas o gestor do grupo pode criar campanhas.');
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        groupId: data.groupId,
        title: data.title,
        subject: data.subject,
        body: data.body,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: 'DRAFT',
        createdById: userId,
      },
    });

    await logAudit({
      req,
      userId,
      action: 'CAMPAIGN_CREATED',
      entity: 'EmailCampaign',
      entityId: campaign.id,
      details: { title: campaign.title, groupId: campaign.groupId },
    });

    return campaign;
  }

  static async sendCampaign(campaignId: string, userId: string, role: Role, req?: Request) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { group: true },
    });

    if (!campaign) throw new Error('Campanha não encontrada.');

    if (campaign.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Acesso negado.');
    }

    if (campaign.status === 'SENT') {
      throw new Error('Esta campanha já foi enviada.');
    }

    // Busca contatos elegíveis (não opt-out)
    const contacts = await prisma.emailContact.findMany({
      where: { optOut: false },
      take: 200, // Envio em lote controlado
    });

    if (contacts.length === 0) {
      throw new Error('Não há contatos elegíveis cadastrados para o disparo.');
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'PROCESSING' },
    });

    // Envio dos e-mails via Mailtrap
    let sentCount = 0;
    for (const contact of contacts) {
      const emailResult = await EmailService.sendCampaignEmail(
        contact.email,
        contact.name,
        campaign.subject,
        campaign.body,
        campaign.group.name
      );

      await prisma.emailCampaignRecipient.upsert({
        where: {
          campaignId_contactId: {
            campaignId,
            contactId: contact.id,
          },
        },
        create: {
          campaignId,
          contactId: contact.id,
          status: emailResult.success ? 'SENT' : 'FAILED',
          errorMessage: emailResult.error || null,
          sentAt: new Date(),
        },
        update: {
          status: emailResult.success ? 'SENT' : 'FAILED',
          errorMessage: emailResult.error || null,
          sentAt: new Date(),
        },
      });
      sentCount++;
    }

    const updated = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    await logAudit({
      req,
      userId,
      action: 'CAMPAIGN_SENT',
      entity: 'EmailCampaign',
      entityId: campaignId,
      details: { sentCount },
    });

    return {
      message: `Campanha enviada com sucesso para ${sentCount} destinatários.`,
      campaign: updated,
    };
  }

  static async getCampaignReport(campaignId: string, userId: string, role: Role) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        group: { select: { id: true, name: true, managerId: true } },
        recipients: {
          include: {
            contact: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!campaign) throw new Error('Campanha não encontrada.');

    if (campaign.group.managerId !== userId && role !== 'SUPER_ADMIN') {
      throw new Error('Acesso negado.');
    }

    const totalRecipients = campaign.recipients.length;
    const sent = campaign.recipients.filter((r) => r.status === 'SENT').length;
    const failed = campaign.recipients.filter((r) => r.status === 'FAILED').length;

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
        groupName: campaign.group.name,
      },
      metrics: {
        totalRecipients,
        sent,
        failed,
        deliveryRate: totalRecipients > 0 ? `${((sent / totalRecipients) * 100).toFixed(1)}%` : '0%',
      },
      sampleRecipients: campaign.recipients.slice(0, 50).map((r) => ({
        email: r.contact.email,
        name: r.contact.name,
        status: r.status,
        sentAt: r.sentAt,
      })),
    };
  }

  static async listCampaigns(userId: string, role: Role) {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    return prisma.emailCampaign.findMany({
      where: isSuperAdmin ? {} : { group: { managerId: userId } },
      include: {
        group: { select: { name: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
