import { Router } from 'express';
import { CampaignsController } from './campaigns.controller.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createCampaignSchema, importContactsSchema } from './campaigns.schemas.js';

const router = Router();

router.use(authenticate, requireRole('ADMINISTRATOR', 'SUPER_ADMIN'));

router.get('/', CampaignsController.listCampaigns);
router.post('/', validate(createCampaignSchema), CampaignsController.createCampaign);
router.post('/import', validate(importContactsSchema), CampaignsController.importContacts);
router.post('/:id/send', CampaignsController.sendCampaign);
router.get('/:id/report', CampaignsController.getReport);

export default router;
