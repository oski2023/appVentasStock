import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { salesRoutes } from './modules/sales/sales.routes.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Plugins base
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
});

// Endpoint de chequeo de salud
fastify.get('/api/health', async (_request, _reply) => {
  return {
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
});

// Módulos
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(catalogRoutes, { prefix: '/api/catalog' });
await fastify.register(salesRoutes, { prefix: '/api/sales' });

// Inicio del servidor
const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`[API] Servidor ejecutándose en http://localhost:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
