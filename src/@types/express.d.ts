import { Role } from '@prisma/client';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  isCpfValidated: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
