import { describe, it, expect } from 'vitest';
import { isValidCpf, cleanCpf, maskCpf, formatCpf } from '../src/utils/cpf.js';

describe('CPF Utilities & LGPD Rules', () => {
  it('deve limpar pontuação e caracteres não numéricos', () => {
    expect(cleanCpf('123.456.789-01')).toBe('12345678901');
    expect(cleanCpf('abc123def456ghi78901')).toBe('12345678901');
  });

  it('deve validar CPFs válidos conhecidos', () => {
    // CPFs válidos matematicamente segundo a regra da Receita
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('12345678909')).toBe(true);
    expect(isValidCpf('123.456.789-09')).toBe(true);
  });

  it('deve rejeitar CPFs com dígitos inválidos ou repetidos', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('12345678900')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });

  it('deve mascarar CPF em conformidade com a LGPD sem expor dígitos centrais ou finais completos', () => {
    const masked = maskCpf('52998224725');
    expect(masked).toBe('***.982.247-**');
  });

  it('deve formatar CPF no padrão 000.000.000-00', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
