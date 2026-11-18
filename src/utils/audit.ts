import { Request } from 'express';
import prisma from '../config/prisma.js';

interface AuditParams {
  req?: Request;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  req,
  userId,
  action,
  entity,
  entityId,
  details,
}: AuditParams): Promise<void> {
  try {
    const finalUserId = userId || req?.user?.id;
    const ipAddress = req?.ip || req?.socket.remoteAddress;
    const userAgent = req?.headers['user-agent'];

    // Sanitiza detalhes para nunca logar senhas, CPFs abertos ou tokens
    const sanitizedDetails = details ? { ...details } : {};
    if (sanitizedDetails.cpf) {
      sanitizedDetails.cpf = '***PROTECTED_BY_LGPD***';
    }
    if (sanitizedDetails.password) {
      delete sanitizedDetails.password;
    }
    if (sanitizedDetails.token) {
      sanitizedDetails.token = '***REDACTED***';
    }

    await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        action,
        entity,
        entityId,
        details: JSON.stringify(sanitizedDetails),
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log de auditoria não deve derrubar a transação de negócio principal se falhar no log isolado
    console.error('Falha ao registrar log de auditoria:', error);
  }
}
