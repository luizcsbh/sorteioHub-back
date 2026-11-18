import { describe, it, expect } from 'vitest';
import { secureRandomInt, generateHash } from '../src/utils/crypto.js';

describe('Motor de Sorteios - Algoritmo e Criptografia', () => {
  it('deve selecionar exatamente a quantidade requisitada de ganhadores sem repetição', () => {
    const participants = [
      'user-1',
      'user-2',
      'user-3',
      'user-4',
      'user-5',
      'user-6',
      'user-7',
      'user-8',
      'user-9',
      'user-10',
    ];

    const winnersToPick = 3;
    const pool = [...participants];
    const selected: string[] = [];

    for (let i = 0; i < winnersToPick; i++) {
      const chosenIndex = secureRandomInt(0, pool.length);
      const chosen = pool.splice(chosenIndex, 1)[0];
      selected.push(chosen);
    }

    expect(selected).toHaveLength(winnersToPick);
    // Verifica que não há nenhum ID repetido
    const uniqueWinners = new Set(selected);
    expect(uniqueWinners.size).toBe(winnersToPick);
    // Verifica que os ganhadores estavam no conjunto original
    for (const w of selected) {
      expect(participants).toContain(w);
    }
  });

  it('deve gerar hash determinístico e consistente para o mesmo conjunto ordenado de participantes', () => {
    const participantsA = ['user-c', 'user-a', 'user-b'];
    const participantsB = ['user-b', 'user-c', 'user-a'];

    const sortedA = [...participantsA].sort();
    const sortedB = [...participantsB].sort();

    const hashA = generateHash(JSON.stringify(sortedA));
    const hashB = generateHash(JSON.stringify(sortedB));

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('deve alterar o hash caso haja qualquer alteração no conjunto de participantes (integridade)', () => {
    const pool1 = ['user-1', 'user-2', 'user-3'];
    const pool2 = ['user-1', 'user-2', 'user-4'];

    const hash1 = generateHash(JSON.stringify(pool1.sort()));
    const hash2 = generateHash(JSON.stringify(pool2.sort()));

    expect(hash1).not.toBe(hash2);
  });

  it('deve respeitar a seleção quando o número de ganhadores for igual ao total de participantes', () => {
    const pool = ['user-1', 'user-2'];
    const selected: string[] = [];
    const poolCopy = [...pool];

    while (poolCopy.length > 0) {
      const idx = secureRandomInt(0, poolCopy.length);
      selected.push(poolCopy.splice(idx, 1)[0]);
    }

    expect(selected).toHaveLength(2);
    expect(new Set(selected).size).toBe(2);
  });
});
