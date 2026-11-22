import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../src/config/jwt.js';

describe('JWT & Session Security', () => {
  it('deve assinar e verificar token JWT com dados do usuário', () => {
    const payload = {
      id: 'test-user-uuid-1234',
      email: 'test@sorteioclub.com.br',
      role: 'ADMINISTRATOR' as const,
      isCpfValidated: true,
    };

    const token = signJwt(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyJwt(token);
    expect(verified.id).toBe(payload.id);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe(payload.role);
    expect(verified.isCpfValidated).toBe(true);
  });

  it('deve rejeitar token adulterado ou com assinatura inválida', () => {
    const payload = {
      id: 'user-1',
      email: 'user@test.com',
      role: 'PARTICIPANT' as const,
      isCpfValidated: false,
    };

    const token = signJwt(payload);
    const tamperedToken = token.slice(0, -5) + 'abcde';

    expect(() => verifyJwt(tamperedToken)).toThrow();
  });
});
