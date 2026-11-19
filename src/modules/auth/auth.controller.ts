import { Request, Response, NextFunction } from 'express';
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

  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, cpf, phone, accountType } = req.body;
      const result = await AuthService.registerWithEmail(
        { name, email, password, cpf, phone, accountType },
        req
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao cadastrar usuário.' });
    }
  }

  static async loginEmail(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginWithEmail({ email, password }, req);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao realizar login.' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }
      const result = await AuthService.updateProfile(req.user.id, req.body, req);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao atualizar perfil.' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }
      const result = await AuthService.changePassword(req.user.id, req.body, req);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao alterar senha.' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'E-mail é obrigatório.' });
        return;
      }
      const result = await AuthService.forgotPassword(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao processar solicitação.' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
        return;
      }
      const result = await AuthService.resetPassword(token, newPassword, req);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao redefinir senha.' });
    }
  }
}
