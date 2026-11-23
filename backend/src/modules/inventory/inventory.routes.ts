import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  createAdjustmentSchema,
  inventoryMovementsQuerySchema,
  inventoryStockQuerySchema,
} from './inventory.schemas.js';
import { InventoryService } from './inventory.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function inventoryRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Consultar panel de alertas de stock bajo (RF-14, RF-15)
  fastify.get(
    '/alerts',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const { estado } = request.query as { estado?: 'activa' | 'resuelta' };
      const alerts = await InventoryService.listAlerts(estado || 'activa');
      return reply.send(alerts);
    }
  );

  // Consultar movimientos de stock auditables (RF-19)
  fastify.get(
    '/movements',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = inventoryMovementsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const movements = await InventoryService.listMovements(parseResult.data);
      return reply.send(movements);
    }
  );

  // Consultar listado de inventario y stock actual (RF-13)
  fastify.get(
    '/stock',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = inventoryStockQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const stock = await InventoryService.getStock(parseResult.data);
      return reply.send(stock);
    }
  );

  // Registrar ajuste manual de inventario (RF-18, RN-10) - Solo Admin
  fastify.post(
    '/adjustments',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const parseResult = createAdjustmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const result = await InventoryService.createAdjustment(parseResult.data, request.user.id);
        return reply.status(201).send(result);
      } catch (error: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al registrar el ajuste de stock',
        });
      }
    }
  );
}
