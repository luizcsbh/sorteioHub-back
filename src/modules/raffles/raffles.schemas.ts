import { z } from 'zod';

export const createRaffleSchema = z.object({
  body: z.object({
    groupId: z.string().uuid('ID de grupo inválido'),
    title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
    description: z.string().min(10, 'Descrição detalhada é obrigatória'),
    prize: z.string().min(3, 'Prêmio é obrigatório'),
    rules: z.string().optional(),
    winnerInstructions: z.string().optional(),
    visibility: z.enum(['PRIVADO', 'RESTRITO_A_GRUPO', 'PUBLICO_COM_CONVITE']).default('RESTRITO_A_GRUPO'),
    maxEntriesPerPerson: z.number().int().positive().default(1),
    numberOfWinners: z.number().int().positive().default(1),
    participationStartDate: z.string().datetime(),
    participationEndDate: z.string().datetime(),
    drawDateTime: z.string().datetime(),
    legalAuthorizationCode: z.string().optional().nullable(),
  }),
});

export const updateRaffleSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de sorteio inválido'),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    prize: z.string().min(3).optional(),
    rules: z.string().optional(),
    winnerInstructions: z.string().optional(),
    visibility: z.enum(['PRIVADO', 'RESTRITO_A_GRUPO', 'PUBLICO_COM_CONVITE']).optional(),
    maxEntriesPerPerson: z.number().int().positive().optional(),
    numberOfWinners: z.number().int().positive().optional(),
    participationStartDate: z.string().datetime().optional(),
    participationEndDate: z.string().datetime().optional(),
    drawDateTime: z.string().datetime().optional(),
    legalAuthorizationCode: z.string().optional().nullable(),
    cancellationReason: z.string().optional(),
  }),
});

export const participateRaffleSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de sorteio inválido'),
  }),
  body: z.object({
    acceptedRules: z.literal(true, {
      errorMap: () => ({ message: 'É obrigatório aceitar o regulamento do sorteio para participar.' }),
    }),
  }),
});
