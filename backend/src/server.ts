import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { salesRoutes } from './modules/sales/sales.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { refundsRoutes } from './modules/refunds/refunds.routes.js';
import { deferredSalesRoutes } from './modules/deferred-sales/deferred-sales.routes.js';
import { labelsRoutes } from './modules/labels/labels.routes.js';
import { importsRoutes } from './modules/imports/imports.routes.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos estáticos de subidas (/uploads)
await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
});

// Plugins base
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB límite para archivos CSV/Excel
  },
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
await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });
await fastify.register(refundsRoutes, { prefix: '/api/refunds' });
await fastify.register(deferredSalesRoutes, { prefix: '/api/sales/deferred' });
await fastify.register(labelsRoutes, { prefix: '/api/labels' });
await fastify.register(importsRoutes, { prefix: '/api/imports' });

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
