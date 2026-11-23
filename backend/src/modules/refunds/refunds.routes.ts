import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { processRefundSchema } from './refunds.schemas.js';
import { RefundsService } from './refunds.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function refundsRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Verificar si la venta es elegible para devolución (validación de 3 días)
  fastify.get(
    '/check-eligibility/:numeroOperacion',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const { numeroOperacion } = request.params as { numeroOperacion: string };
      const result = await RefundsService.checkEligibility(numeroOperacion);
      return reply.send(result);
    }
  );

  // Procesar devolución con reposición de stock inmediata (RF-23, RN-09, RN-17, RN-19)
  fastify.post(
    '/',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = processRefundSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const result = await RefundsService.processRefund(
          parseResult.data,
          request.user.id,
          request.user.role
        );
        return reply.status(201).send(result);
      } catch (error: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al procesar la devolución',
        });
      }
    }
  );

  // Historial de devoluciones
  fastify.get(
    '/',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (_request, reply) => {
      const refunds = await RefundsService.listRefunds();
      return reply.send(refunds);
    }
  );
}
