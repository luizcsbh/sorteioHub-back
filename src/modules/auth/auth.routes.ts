import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { googleAuthSchema, completeProfileSchema, registerSchema, emailLoginSchema } from './auth.schemas.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.post('/google', validate(googleAuthSchema), AuthController.loginWithGoogle);
router.post('/complete-profile', authenticate, validate(completeProfileSchema), AuthController.completeProfile);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(emailLoginSchema), AuthController.loginEmail);

export default router;
