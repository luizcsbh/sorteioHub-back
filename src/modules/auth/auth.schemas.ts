import { z } from 'zod';
import { isValidCpf } from '../../utils/cpf.js';

export const googleAuthSchema = z.object({
  body: z.object({
    credential: z.string().optional(),
    // Campos alternativos para ambiente de desenvolvimento/testes locais
    mockProfile: z
      .object({
        googleId: z.string(),
        email: z.string().email('E-mail inválido'),
        name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
        avatarUrl: z.string().url().optional(),
      })
      .optional(),
  }).refine((data) => data.credential || data.mockProfile, {
    message: 'É necessário fornecer o token de credencial do Google ou o perfil simulado de testes.',
  }),
});

export const completeProfileSchema = z.object({
  body: z.object({
    cpf: z.string().refine(isValidCpf, {
      message: 'CPF inválido. Verifique os números digitados.',
    }),
    phone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos com DDD'),
    cep: z.string().min(8, 'CEP deve ter 8 dígitos'),
    logradouro: z.string().min(2, 'Logradouro é obrigatório'),
    numero: z.string().min(1, 'Número do endereço é obrigatório'),
    complemento: z.string().optional().nullable(),
    bairro: z.string().min(2, 'Bairro é obrigatório'),
    cidade: z.string().min(2, 'Cidade é obrigatória'),
    estado: z.string().length(2, 'Estado deve conter a sigla UF de 2 letras (ex: SP, RJ)'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'É obrigatório aceitar os Termos de Uso.' }),
    }),
    acceptPrivacyPolicy: z.literal(true, {
      errorMap: () => ({ message: 'É obrigatório aceitar a Política de Privacidade (LGPD).' }),
    }),
  }),
});
