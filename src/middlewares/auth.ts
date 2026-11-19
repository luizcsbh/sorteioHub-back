import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../config/jwt.js';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { isValidCpf } from '../utils/cpf.js';

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

export async function requireValidatedCpf(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Acesso não autenticado.' });
    return;
  }

  if (req.user.isCpfValidated) {
    return next();
  }

  // Verifica se o usuário tem CPF validado no banco
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isCpfValidated: true },
  });

  if (dbUser?.isCpfValidated) {
    req.user.isCpfValidated = true;
    return next();
  }

  // Se enviou CPF no corpo da requisição (ex: fluxo de participação rápida via PIN)
  if (req.body?.cpf && isValidCpf(req.body.cpf)) {
    return next();
  }

  res.status(403).json({
    error: 'É obrigatório ter um CPF válido cadastrado para participar desta ação.',
    code: 'CPF_REQUIRED',
  });
}
