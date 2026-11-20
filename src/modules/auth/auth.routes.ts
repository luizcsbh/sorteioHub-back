import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  googleAuthSchema,
  completeProfileSchema,
  registerSchema,
  emailLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.schemas.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.post('/google', validate(googleAuthSchema), AuthController.loginWithGoogle);
router.post('/complete-profile', authenticate, validate(completeProfileSchema), AuthController.completeProfile);
router.get('/me', authenticate, AuthController.getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), AuthController.updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);
router.post('/logout', AuthController.logout);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(emailLoginSchema), AuthController.loginEmail);

// Recuperação de senha
router.post('/forgot-password', AuthController.forgotPassword);
router.get('/forgot-password', (req, res) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
  // Se for requisição de navegador, redireciona para a página do frontend
  if (req.accepts('html')) {
    return res.redirect(`${frontendUrl}/forgot-password`);
  }
  return res.status(405).json({
    error: 'Método não permitido para esta rota. Utilize POST /api/auth/forgot-password enviando { email: string } no corpo da requisição.',
  });
});

router.post('/reset-password', AuthController.resetPassword);
router.get('/reset-password/:token', (req, res) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
  if (req.accepts('html')) {
    return res.redirect(`${frontendUrl}/reset-password/${req.params.token}`);
  }
  return res.status(405).json({
    error: 'Método não permitido para esta rota. Utilize POST /api/auth/reset-password enviando { token: string, newPassword: string } no corpo da requisição.',
  });
});

export default router;
