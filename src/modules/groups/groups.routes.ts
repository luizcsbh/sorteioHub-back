import { Router } from 'express';
import { GroupsController } from './groups.controller.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  createGroupSchema,
  updateGroupSchema,
  createInvitationSchema,
  joinGroupSchema,
} from './groups.schemas.js';

const router = Router();

// Todas as rotas de grupos exigem autenticação
router.use(authenticate);

// Gestão de Grupos
router.post(
  '/',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  validate(createGroupSchema),
  GroupsController.createGroup
);

router.get('/', GroupsController.listGroups);

router.get('/:id', GroupsController.getGroupById);

router.put(
  '/:id',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  validate(updateGroupSchema),
  GroupsController.updateGroup
);

router.delete(
  '/:id',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  GroupsController.deleteGroup
);

// Membros e Convites
router.get('/:id/members', GroupsController.listMembers);

router.post(
  '/:id/invitations',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  validate(createInvitationSchema),
  GroupsController.createInvitation
);

router.post(
  '/join/:token',
  validate(joinGroupSchema),
  GroupsController.joinWithToken
);

router.post(
  '/:id/members/:userId/approve',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  GroupsController.approveMember
);

router.delete(
  '/:id/members/:userId',
  requireRole('ADMINISTRATOR', 'SUPER_ADMIN'),
  GroupsController.removeMember
);

export default router;
