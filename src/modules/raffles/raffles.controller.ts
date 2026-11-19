import { Request, Response } from 'express';
import { RafflesService } from './raffles.service.js';
import { DrawEngine } from '../draw/draw.engine.js';

export class RafflesController {
  // Participante / Geral
  static async listRaffles(req: Request, res: Response) {
    try {
      const raffles = await RafflesService.listRaffles(
        req.user!.id,
        req.user!.role,
        req.query.filter as string
      );
      res.json(raffles);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao listar sorteios.' });
    }
  }

  static async getRaffleById(req: Request, res: Response) {
    try {
      const raffle = await RafflesService.getRaffleById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json(raffle);
    } catch (error: any) {
      res.status(403).json({ error: error.message || 'Erro ao buscar sorteio.' });
    }
  }

  static async getPublicRaffle(req: Request, res: Response) {
    try {
      const raffle = await RafflesService.getPublicRaffle(req.params.identifier);
      res.json(raffle);
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Sorteio não encontrado.' });
    }
  }

  static async participate(req: Request, res: Response) {
    try {
      const result = await RafflesService.participate(
        req.params.id,
        req.user!.id,
        req,
        req.body?.cpf
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao confirmar participação.' });
    }
  }

  static async getResults(req: Request, res: Response) {
    try {
      const results = await RafflesService.getResults(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json(results);
    } catch (error: any) {
      res.status(403).json({ error: error.message || 'Erro ao consultar resultados.' });
    }
  }

  // Admin / Gestão
  static async createRaffle(req: Request, res: Response) {
    try {
      const raffle = await RafflesService.createRaffle(
        req.user!.id,
        req.user!.role,
        req.body,
        req
      );
      res.status(201).json(raffle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao criar sorteio.' });
    }
  }

  static async updateRaffle(req: Request, res: Response) {
    try {
      const updated = await RafflesService.updateRaffle(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body,
        req
      );
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao atualizar sorteio.' });
    }
  }

  static async deleteRaffle(req: Request, res: Response) {
    try {
      const result = await RafflesService.deleteRaffle(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao excluir sorteio.' });
    }
  }

  static async publishRaffle(req: Request, res: Response) {
    try {
      const result = await RafflesService.publishRaffle(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao publicar sorteio.' });
    }
  }

  static async executeDraw(req: Request, res: Response) {
    try {
      const result = await DrawEngine.executeDraw(req.params.id, req.user!.id, req);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao realizar sorteio.' });
    }
  }
}
