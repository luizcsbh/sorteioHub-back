import { Request, Response } from 'express';
import { CampaignsService } from './campaigns.service.js';

export class CampaignsController {
  static async listCampaigns(req: Request, res: Response) {
    try {
      const list = await CampaignsService.listCampaigns(req.user!.id, req.user!.role);
      res.json(list);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao listar campanhas.' });
    }
  }

  static async createCampaign(req: Request, res: Response) {
    try {
      const campaign = await CampaignsService.createCampaign(
        req.user!.id,
        req.user!.role,
        req.body,
        req
      );
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao criar campanha.' });
    }
  }

  static async importContacts(req: Request, res: Response) {
    try {
      const result = await CampaignsService.importContacts(
        req.body.contacts,
        req.user!.id,
        req
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao importar contatos.' });
    }
  }

  static async sendCampaign(req: Request, res: Response) {
    try {
      const result = await CampaignsService.sendCampaign(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao disparar campanha.' });
    }
  }

  static async getReport(req: Request, res: Response) {
    try {
      const report = await CampaignsService.getCampaignReport(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao obter relatório da campanha.' });
    }
  }
}
