import { z } from 'zod';

export const createCampaignSchema = z.object({
  body: z.object({
    groupId: z.string().uuid('ID de grupo inválido'),
    title: z.string().min(3, 'Título da campanha é obrigatório'),
    subject: z.string().min(3, 'Assunto do e-mail é obrigatório'),
    body: z.string().min(10, 'Conteúdo da mensagem é obrigatório'),
    scheduledAt: z.string().datetime().optional().nullable(),
  }),
});

export const importContactsSchema = z.object({
  body: z.object({
    contacts: z.array(
      z.object({
        email: z.string().email('E-mail inválido'),
        name: z.string().optional(),
      })
    ).min(1, 'Forneça pelo menos 1 contato para importação'),
  }),
});
