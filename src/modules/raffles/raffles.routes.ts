import { Router } from 'express';
import { RafflesController } from './raffles.controller.js';
import { authenticate, requireValidatedCpf } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { participateRaffleSchema } from './raffles.schemas.js';

const router = Router();

// Todas as rotas de sorteio exigem autenticação
router.use(authenticate);

router.get('/', RafflesController.listRaffles);
router.get('/:id', RafflesController.getRaffleById);
router.get('/:id/results', RafflesController.getResults);

// Inscrição exige CPF validado
router.post(
  '/:id/participate',
  requireValidatedCpf,
  validate(participateRaffleSchema),
  RafflesController.participate
);

export default router;
