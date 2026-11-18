import { Request, Response } from 'express';
import { GroupsService } from './groups.service.js';

export class GroupsController {
  static async createGroup(req: Request, res: Response) {
    try {
      const group = await GroupsService.createGroup(req.user!.id, req.body, req);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao criar grupo.' });
    }
  }

  static async listGroups(req: Request, res: Response) {
    try {
      const groups = await GroupsService.listGroups(req.user!.id, req.user!.role);
      res.json(groups);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao listar grupos.' });
    }
  }

  static async getGroupById(req: Request, res: Response) {
    try {
      const group = await GroupsService.getGroupById(req.params.id, req.user!.id, req.user!.role);
      res.json(group);
    } catch (error: any) {
      res.status(403).json({ error: error.message || 'Erro ao consultar grupo.' });
    }
  }

  static async updateGroup(req: Request, res: Response) {
    try {
      const group = await GroupsService.updateGroup(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body,
        req
      );
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao atualizar grupo.' });
    }
  }

  static async deleteGroup(req: Request, res: Response) {
    try {
      const result = await GroupsService.deleteOrArchiveGroup(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao excluir/arquivar grupo.' });
    }
  }

  static async listMembers(req: Request, res: Response) {
    try {
      const members = await GroupsService.listGroupMembers(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json(members);
    } catch (error: any) {
      res.status(403).json({ error: error.message || 'Erro ao listar membros.' });
    }
  }

  static async createInvitation(req: Request, res: Response) {
    try {
      const invitation = await GroupsService.createInvitation(
        req.params.id,
        req.user!.id,
        req.body,
        req
      );
      res.status(201).json(invitation);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao criar convite.' });
    }
  }

  static async joinWithToken(req: Request, res: Response) {
    try {
      const result = await GroupsService.joinGroupWithToken(req.params.token, req.user!.id, req);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao ingressar no grupo.' });
    }
  }

  static async approveMember(req: Request, res: Response) {
    try {
      const member = await GroupsService.approveMember(
        req.params.id,
        req.params.userId,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao aprovar participante.' });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      const result = await GroupsService.removeMember(
        req.params.id,
        req.params.userId,
        req.user!.id,
        req.user!.role,
        req
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao remover participante.' });
    }
  }
}
