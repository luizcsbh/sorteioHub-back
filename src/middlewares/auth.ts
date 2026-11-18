import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../config/jwt.js';
import { Role } from '@prisma/client';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Acesso não autenticado.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado. Perfil de usuário sem permissão necessária.' });
      return;
    }

    next();
  };
}

export function requireValidatedCpf(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Acesso não autenticado.' });
    return;
  }

  if (!req.user.isCpfValidated) {
    res.status(403).json({
      error: 'É obrigatório ter um CPF válido cadastrado para participar desta ação.',
      code: 'CPF_REQUIRED',
    });
    return;
  }

  next();
}
