import crypto from 'crypto';

const HMAC_SECRET = process.env.CPF_HMAC_SECRET || 'sorteioclub-default-hmac-secret-change-in-prod';
// Chave AES-256 deve ter 32 bytes
const ENCRYPTION_KEY_RAW = process.env.CPF_ENCRYPTION_KEY || '01234567890123456789012345678901';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();

/**
 * Gera um hash HMAC-SHA256 determinístico para identificação de duplicidade de CPF
 * sem necessidade de armazenar ou consultar o CPF em texto simples.
 */
export function hashCpf(cpfClean: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(cpfClean)
    .digest('hex');
}

/**
 * Criptografa o CPF com AES-256-GCM garantindo confidencialidade e integridade (LGPD)
 */
export function encryptCpf(cpfClean: string): string {
  const iv = crypto.randomBytes(12); // IV de 12 bytes recomendado para GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(cpfClean, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Formato: iv:tag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa o CPF protegido
 */
export function decryptCpf(encryptedPayload: string): string {
  const [ivHex, tagHex, encryptedText] = encryptedPayload.split(':');
  if (!ivHex || !tagHex || !encryptedText) {
    throw new Error('Payload criptográfico inválido.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Gera tokens aleatórios e imprevisíveis para convites e sessões
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Sorteador uniforme e criptograficamente seguro (sem viés, usando crypto.randomInt)
 */
export function secureRandomInt(min: number, max: number): number {
  return crypto.randomInt(min, max);
}

/**
 * Gera hash SHA-256 para auditoria de pools de participantes
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
