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

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;
      const action = req.query.action as string;
      const result = await AdminService.getAuditLogs(
        req.user!.id,
        req.user!.role,
        page,
        limit,
        search,
        action
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao listar trilha de auditoria.' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const search = req.query.search as string;
      const roleFilter = req.query.role as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await AdminService.getUsers(search, roleFilter, page, limit);
      res.json(result);
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
