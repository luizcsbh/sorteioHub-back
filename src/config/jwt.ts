import jwt from 'jsonwebtoken';
import { TokenPayload } from '../@types/express.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sorteioclub-default-jwt-secret-secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signJwt(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

export function verifyJwt(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
