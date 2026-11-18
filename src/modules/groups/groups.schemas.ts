import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Nome do grupo deve ter pelo menos 3 caracteres'),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().nullable(),
    maxMembers: z.number().int().positive().optional().nullable(),
    autoApprove: z.boolean().default(false),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de grupo inválido'),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().nullable(),
    maxMembers: z.number().int().positive().optional().nullable(),
    autoApprove: z.boolean().optional(),
    status: z.enum(['ATIVO', 'INATIVO', 'ARQUIVADO']).optional(),
  }),
});

export const createInvitationSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de grupo inválido'),
  }),
  body: z.object({
    type: z.enum(['INDIVIDUAL_EMAIL', 'TOKEN_LINK', 'LIST_IMPORT']).default('TOKEN_LINK'),
    targetEmail: z.string().email().optional().nullable(),
    maxUses: z.number().int().positive().default(1),
    expiresInDays: z.number().int().positive().default(7),
  }),
});

export const joinGroupSchema = z.object({
  params: z.object({
    token: z.string().min(10, 'Token de convite inválido'),
  }),
});
