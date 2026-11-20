import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Suporte nativo ao Resend (HTTP API - recomendado para evitar bloqueio de portas SMTP no Render/Cloud)
export const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const host = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
const port = parseInt(process.env.SMTP_PORT || '2525', 10);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
});

export const mailDefaults = {
  from:
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    '"SorteioHub" <onboarding@resend.dev>',
};
