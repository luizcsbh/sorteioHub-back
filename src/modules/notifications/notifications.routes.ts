import { Router, Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao buscar notificações.' });
  }
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { status: 'READ', readAt: new Date() },
    });
    res.json({ success: true, count: updated.count });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao marcar notificação como lida.' });
  }
});

export default router;
