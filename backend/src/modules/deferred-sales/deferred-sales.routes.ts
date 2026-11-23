import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createDeferredSaleSchema } from './deferred-sales.schemas.js';
import { DeferredSalesService } from './deferred-sales.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function deferredSalesRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Carga de ventas diferidas post-corte de internet (RF-33, RN-18, CA-20)
  fastify.post(
    '/',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = createDeferredSaleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const result = await DeferredSalesService.createDeferredSale(
          parseResult.data,
          request.user.id
        );
        return reply.status(201).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al registrar la venta diferida',
        });
      }
    }
  );
}
