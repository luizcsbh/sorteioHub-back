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
}
