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

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  }),
});

export const emailLoginSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
});
