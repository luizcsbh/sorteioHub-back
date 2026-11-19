import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';

export class AdminController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const dashboard = await AdminService.getDashboard(req.user!.id, req.user!.role);
      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao carregar dashboard.' });
    }
  }

  static async getReports(req: Request, res: Response) {
    try {
      const reports = await AdminService.getReports(
        req.user!.id,
        req.user!.role,
        req.query.type as string
      );
      res.json(reports);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao carregar relatórios.' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const search = req.query.search as string;
      const roleFilter = req.query.role as string;
      const users = await AdminService.getUsers(search, roleFilter);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao listar usuários.' });
    }
  }

  static async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!role) {
        res.status(400).json({ error: 'O novo papel (role) é obrigatório.' });
        return;
      }
      const updated = await AdminService.updateUserRole(req.user!.id, id, role, req);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao alterar papel do usuário.' });
    }
  }
}
