import cors, { CorsOptions } from 'cors';

/**
 * Normaliza uma URL de origem removendo a barra final
 */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Obtém a lista de origens configuradas via variáveis de ambiente
 */
function getConfiguredOrigins(): string[] {
  const envOrigins = process.env.FRONTEND_URL || '';
  return envOrigins
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

// Origens padrão permitidas para desenvolvimento local
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem header Origin (ex: ferramentas de teste como Postman/cURL, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const configuredOrigins = getConfiguredOrigins();

    // Se wildcard '*' estiver explicitamente configurado no FRONTEND_URL
    if (configuredOrigins.includes('*')) {
      return callback(null, true);
    }

    // Se estiver na lista configurada no .env
    if (configuredOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Em ambiente de desenvolvimento, aceita origens locais e qualquer porta
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      if (defaultDevOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Aceita localhost, 127.0.0.1 ou IPs de rede local (ex: testes no celular)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);
      const isLocalNetwork = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin);

      if (isLocalhost || isLocalNetwork) {
        return callback(null, true);
      }
    }

    // Origem não autorizada
    console.warn(`[CORS] Requisição bloqueada para a origem: ${origin}`);
    return callback(new Error(`Bloqueado pelo CORS: a origem ${origin} não tem permissão de acesso.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 horas de cache para preflight OPTIONS
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);
export default corsMiddleware;
