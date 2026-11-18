import { describe, it, expect } from 'vitest';
import {
  hashCpf,
  encryptCpf,
  decryptCpf,
  generateSecureToken,
  secureRandomInt,
  generateHash,
} from '../src/utils/crypto.js';

describe('Cryptographic & Security Utilities', () => {
  it('deve gerar hashes HMAC consistentes e determinísticos para o mesmo CPF', () => {
    const cpf1 = '52998224725';
    const hash1 = hashCpf(cpf1);
    const hash2 = hashCpf(cpf1);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 em hex
  });

  it('deve gerar hashes diferentes para CPFs distintos', () => {
    const hash1 = hashCpf('52998224725');
    const hash2 = hashCpf('71420790076');

    expect(hash1).not.toBe(hash2);
  });

  it('deve criptografar e descriptografar CPF com AES-256-GCM sem corromper dados', () => {
    const originalCpf = '52998224725';
    const encrypted = encryptCpf(originalCpf);

    expect(encrypted).not.toBe(originalCpf);
    expect(encrypted).toContain(':'); // IV : AuthTag : EncryptedText

    const decrypted = decryptCpf(encrypted);
    expect(decrypted).toBe(originalCpf);
  });

  it('deve gerar tokens aleatórios seguros com tamanho esperado', () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it('deve gerar números aleatórios uniformes dentro do intervalo especificado com crypto.randomInt', () => {
    for (let i = 0; i < 50; i++) {
      const rand = secureRandomInt(0, 10);
      expect(rand).toBeGreaterThanOrEqual(0);
      expect(rand).toBeLessThan(10);
    }
  });

  it('deve calcular hash SHA-256 para auditoria de participantes', () => {
    const hash = generateHash(JSON.stringify(['id-1', 'id-2', 'id-3']));
    expect(hash).toHaveLength(64);
  });
});
