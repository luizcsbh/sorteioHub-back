import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import corsMiddleware from './config/cors.js';

import authRoutes from './modules/auth/auth.routes.js';
import groupsRoutes from './modules/groups/groups.routes.js';
import rafflesRoutes from './modules/raffles/raffles.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import campaignsRoutes from './modules/campaigns/campaigns.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';

export const app = express();

// Middlewares de segurança e CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);
app.use(corsMiddleware);

// Rate Limiter para conter abusos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições originadas deste IP. Tente novamente mais tarde.' },
});

app.use(limiter);
app.use(express.json());

// Rota raiz (Verificação de status)
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'SorteioHub API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: '/health',
    docs: 'Endpoints disponíveis em /api/*',
  });
});

// Endpoint de verificação de integridade
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SorteioHub API',
  });
});

// Registro de Rotas da API (com suporte com ou sem prefixo /api)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/groups', groupsRoutes);
app.use('/groups', groupsRoutes);

app.use('/api/raffles', rafflesRoutes);
app.use('/raffles', rafflesRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use('/api/admin/campaigns', campaignsRoutes);
app.use('/admin/campaigns', campaignsRoutes);

app.use('/api/notifications', notificationsRoutes);
app.use('/notifications', notificationsRoutes);

// Tratamento de rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de erro
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Ocorreu um erro interno no servidor.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
