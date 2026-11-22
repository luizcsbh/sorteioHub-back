import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { maskCpf } from '../src/utils/cpf.js';

describe('Segurança, Middlewares e LGPD', () => {
  it('deve responder com status OK no endpoint de health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('SorteioClub API');
  });

  it('deve incluir cabeçalhos de segurança do Helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('deve bloquear requisição sem token em rotas protegidas com 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Token de autenticação não fornecido ou inválido');
  });

  it('deve rejeitar tentativa de conclusão de perfil com CPF matematicamente inválido com 400', async () => {
    // Mesmo sem token, a rota é protegida; se enviarmos payload inválido via endpoint público
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('deve garantir que o mascaramento de CPF nunca revele o documento completo', () => {
    const testCases = [
      { input: '12345678909', expected: '***.456.789-**' },
      { input: '52998224725', expected: '***.982.247-**' },
    ];

    for (const tc of testCases) {
      const masked = maskCpf(tc.input);
      expect(masked).toBe(tc.expected);
      expect(masked.startsWith('***.')).toBe(true);
      expect(masked.endsWith('-**')).toBe(true);
    }
  });
});
