import { mailTransporter, mailDefaults, resendClient } from '../config/mail.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

export class EmailService {
  /**
   * Envia e-mail utilizando Resend (HTTP API) prioritariamente,
   * com fallback para SMTP (Nodemailer / Mailtrap) e modo simulação se não houver credenciais.
   */
  static async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      let resendErrorMessage = '';

      // 1. Prioridade: Resend via API HTTP oficial
      if (resendClient) {
        const fromAddress = mailDefaults.from;
        const response = await resendClient.emails.send({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        if (!response.error) {
          const messageId = response.data?.id;
          console.log(`[Resend] E-mail enviado com sucesso para ${options.to}. ID: ${messageId}`);
          return { success: true, messageId };
        }

        resendErrorMessage = response.error.message;
        console.warn(`[Resend] Falha no disparo para ${options.to} (${response.error.name}): ${resendErrorMessage}. Tentando fallback SMTP se configurado...`);
      }

      // 2. Fallback: SMTP via Nodemailer (Gmail, Brevo, Mailtrap, etc.)
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const info = await mailTransporter.sendMail({
            from: mailDefaults.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
          });

          console.log(`[SMTP] E-mail enviado com sucesso para ${options.to}. ID: ${info.messageId}`);
          return { success: true, messageId: info.messageId };
        } catch (smtpErr: any) {
          console.error(`[SMTP] Falha no disparo via SMTP para ${options.to}:`, smtpErr.message);
          return {
            success: false,
            error: resendErrorMessage ? `Resend: ${resendErrorMessage} | SMTP: ${smtpErr.message}` : smtpErr.message,
          };
        }
      }

      // Se Resend falhou e não há SMTP configurado
      if (resendErrorMessage) {
        return { success: false, error: resendErrorMessage };
      }

      // 3. Fallback seguro: Simulação em ambiente de desenvolvimento sem credenciais
      console.log(`[Email Simulado] (Credenciais ausentes - simulação para ${options.to}): Assunto: "${options.subject}"`);
      return { success: true, messageId: 'simulated-email-id' };
    } catch (error: any) {
      console.error(`[Email Service] Falha geral no disparo para ${options.to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificação individual de ganhador
   */
  static async sendWinnerNotification(
    to: string,
    name: string,
    raffleTitle: string,
    prize: string,
    instructions?: string | null
  ) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 26px;">🎉 Parabéns, ${name}!</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Você foi contemplado no SorteioHub!</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6;">Temos o prazer de informar que seu bilhete foi selecionado no sorteio:</p>
            <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Sorteio:</p>
              <h2 style="margin: 4px 0 12px 0; font-size: 18px; color: #0f172a;">${raffleTitle}</h2>
              <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Prêmio:</p>
              <h3 style="margin: 4px 0 0 0; font-size: 20px; color: #4f46e5;">${prize}</h3>
            </div>
            ${
              instructions
                ? `
              <div style="border-left: 4px solid #4f46e5; padding-left: 14px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; font-weight: bold; color: #334155;">Instruções para Resgate do Prêmio:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569; line-height: 1.5;">${instructions}</p>
              </div>
            `
                : ''
            }
            <p style="font-size: 13px; color: #64748b; margin-top: 25px;">Acesse sua conta no SorteioHub para conferir os detalhes e o comprovante com auditoria criptográfica.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            SorteioHub • Plataforma de Sorteios Privados em Grupos Fechados (LGPD Compliant)
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: `🏆 Parabéns! Você ganhou: ${prize} no sorteio "${raffleTitle}"`,
      html,
    });
  }

  /**
   * Notificação de conclusão de sorteio para participantes
   */
  static async sendRaffleFinishedNotification(to: string, name: string, raffleTitle: string, prize: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">Sorteio Concluído</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">SorteioHub • Resultados Oficiais</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; line-height: 1.6;">Olá, <strong>${name}</strong>!</p>
            <p style="font-size: 14px; line-height: 1.6;">O sorteio <strong>"${raffleTitle}"</strong> (Prêmio: <em>${prize}</em>) acabou de ser realizado através do nosso motor criptográfico auditável.</p>
            <p style="font-size: 14px; line-height: 1.6;">Os resultados oficiais, com as evidências criptográficas (hash SHA-256 e semente imutável) e a lista de contemplados, já estão disponíveis no seu painel.</p>
            <div style="margin: 25px 0; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Ver Resultados Oficiais
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            SorteioHub • Sorteios Auditáveis & LGPD
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: `Sorteio Realizado: "${raffleTitle}" - Confira os Resultados Oficiais`,
      html,
    });
  }

  /**
   * Convite para grupo fechado
   */
  static async sendGroupInvitationEmail(to: string, groupName: string, inviteUrl: string, managerName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 26px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 22px;">Convite para Grupo Fechado</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">SorteioHub • Acesso Exclusivo</p>
          </div>
          <div style="padding: 26px;">
            <p style="font-size: 14px; line-height: 1.6;">Olá!</p>
            <p style="font-size: 14px; line-height: 1.6;">Você foi convidado por <strong>${managerName}</strong> para participar do grupo privado <strong>"${groupName}"</strong> no SorteioHub.</p>
            <p style="font-size: 14px; line-height: 1.6;">Neste grupo, você terá acesso a sorteios exclusivos com garantia de integridade, transparência e proteção de dados (LGPD).</p>
            <div style="margin: 25px 0; text-align: center;">
              <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Aceitar Convite e Acessar Grupo
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">Ou copie e cole o link no seu navegador:<br/><code style="word-break: break-all; color: #4f46e5;">${inviteUrl}</code></p>
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: `Convite: Entre no grupo fechado "${groupName}" no SorteioHub`,
      html,
    });
  }

  /**
   * Disparo de campanha em lote
   */
  static async sendCampaignEmail(to: string, contactName: string | null, subject: string, body: string, groupName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background-color: #4f46e5; padding: 22px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">${groupName}</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Comunicação Oficial</p>
          </div>
          <div style="padding: 26px;">
            ${contactName ? `<p style="font-size: 14px; font-weight: bold;">Olá, ${contactName}!</p>` : ''}
            <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;">${body}</div>
            <div style="margin: 25px 0; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                Acessar Plataforma
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Mensagem enviada através do SorteioHub. Se deseja não receber mais convites desta lista, utilize o link de descadastro.
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      html,
    });
  }

  /**
   * E-mail de redefinição de senha
   */
  static async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; padding: 30px; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 30px; text-align: center; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <h1 style="margin: 0; font-size: 24px; color: #facc15;">🔐 Redefinição de Senha</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.7);">SorteioHub • Segurança da Conta</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.85);">Olá, <strong style="color: #facc15;">${name}</strong>!</p>
            <p style="font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.7);">Recebemos uma solicitação para redefinir a senha da sua conta no SorteioHub. Clique no botão abaixo para criar uma nova senha:</p>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${resetUrl}" style="background-color: #facc15; color: #0f172a; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 900; font-size: 15px; display: inline-block; letter-spacing: 0.5px;">
                Redefinir Minha Senha
              </a>
            </div>
            <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5);">⏱️ Este link expira em <strong style="color: rgba(255,255,255,0.8);">1 hora</strong>. Após este prazo, será necessário solicitar um novo link.</p>
            </div>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6;">Se você não solicitou a redefinição de senha, desconsidere esta mensagem. Sua conta permanece segura.</p>
            <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 16px; word-break: break-all;">Link direto: ${resetUrl}</p>
          </div>
          <div style="background-color: rgba(0,0,0,0.3); padding: 16px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.3); border-top: 1px solid rgba(255,255,255,0.08);">
            SorteioHub • Plataforma de Sorteios Privados em Grupos Fechados (LGPD Compliant)
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: '🔐 Redefinição de Senha — SorteioHub',
      html,
    });
  }
}
