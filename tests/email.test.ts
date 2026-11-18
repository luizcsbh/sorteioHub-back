import { describe, it, expect } from 'vitest';
import { EmailService } from '../src/services/email.service.js';

describe('Mailtrap.io Email Service', () => {
  it('deve simular ou disparar e-mail de notificação de ganhador com sucesso', async () => {
    const result = await EmailService.sendWinnerNotification(
      'ganhador@exemplo.com.br',
      'Carlos Silva',
      'Sorteio de Páscoa VIP',
      'iPhone 16 Pro 256GB',
      'Favor retirar o prêmio na recepção ou enviar endereço de entrega.'
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('deve formatar e disparar e-mail de convite para grupo fechado', async () => {
    const result = await EmailService.sendGroupInvitationEmail(
      'convidado@exemplo.com.br',
      'Clientes VIP 2026',
      'http://localhost:5173/invite/token-de-teste-123',
      'Gestor de Comunidade'
    );

    expect(result.success).toBe(true);
  });

  it('deve formatar e disparar e-mail de encerramento e resultado de sorteio', async () => {
    const result = await EmailService.sendRaffleFinishedNotification(
      'participante@exemplo.com.br',
      'Maria Santos',
      'Sorteio de Páscoa VIP',
      'iPhone 16 Pro 256GB'
    );

    expect(result.success).toBe(true);
  });
});
