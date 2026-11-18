import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
const port = parseInt(process.env.SMTP_PORT || '2525', 10);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  auth: user && pass ? { user, pass } : undefined,
});

export const mailDefaults = {
  from: process.env.SMTP_FROM || '"SorteioHub" <nao-responda@sorteiohub.com.br>',
};
