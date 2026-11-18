import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  static async loginWithGoogle(req: Request, res: Response) {
    try {
      const result = await AuthService.loginWithGoogle(req.body, req);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Falha ao autenticar com Google.' });
    }
  }

  static async completeProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }
      const result = await AuthService.completeProfile(req.user.id, req.body, req);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Falha ao concluir cadastro.' });
    }
  }

  static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }
      const me = await AuthService.getMe(req.user.id);
      res.json(me);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Falha ao obter perfil.' });
    }
  }

  static async logout(req: Request, res: Response) {
    // JWT é stateless, no backend confirmamos sucesso para que o cliente descarte o token
    res.json({ message: 'Sessão encerrada com sucesso.' });
  }
}
