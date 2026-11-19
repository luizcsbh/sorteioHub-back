import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { RafflesController } from '../raffles/raffles.controller.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createRaffleSchema, updateRaffleSchema } from '../raffles/raffles.schemas.js';

const router = Router();

// Todas as rotas admin exigem papel de ADMINISTRATOR ou SUPER_ADMIN
router.use(authenticate, requireRole('ADMINISTRATOR', 'SUPER_ADMIN'));

// Gestão de Sorteios
router.post('/raffles', validate(createRaffleSchema), RafflesController.createRaffle);
router.put('/raffles/:id', validate(updateRaffleSchema), RafflesController.updateRaffle);
router.delete('/raffles/:id', RafflesController.deleteRaffle);
router.post('/raffles/:id/publish', RafflesController.publishRaffle);
router.post('/raffles/:id/draw', RafflesController.executeDraw);

// Dashboard e Relatórios
router.get('/dashboard', AdminController.getDashboard);
router.get('/reports', AdminController.getReports);

// Gestão de Usuários e Cargos (Roles)
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/role', AdminController.updateUserRole);

export default router;
