import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  createAssistedSaleSchema,
  verifyDeliverySchema,
  salesListQuerySchema,
} from './sales.schemas.js';
import { SalesService } from './sales.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function salesRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Registrar venta asistida con pago manual (RF-25, RF-26)
  fastify.post(
    '/assisted',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = createAssistedSaleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const result = await SalesService.createAssistedSale(
          parseResult.data,
          request.user.id
        );
        return reply.status(201).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al procesar la venta',
        });
      }
    }
  );

  // Obtener comprobante por número de operación (RF-21) - Público
  fastify.get('/receipt/:numeroOperacion', async (request, reply) => {
    const { numeroOperacion } = request.params as { numeroOperacion: string };
    const receipt = await SalesService.getReceipt(numeroOperacion);
    if (!receipt) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No se encontró ningún comprobante con ese número de operación',
      });
    }
    return reply.send(receipt);
  });

  // Guardar pedido armado por cliente desde su celular (RF-07, RF-09) - Público
  fastify.post('/customer-orders', async (request, reply) => {
    const body = request.body as any;
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        message: 'El pedido debe incluir al menos una prenda o variante.',
      });
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PED-${Date.now().toString(36).toUpperCase().slice(-4)}-${randNum}`;

    const order = {
      orderNumber,
      items: body.items,
      total: body.total || 0,
      createdAt: new Date().toISOString(),
    };

    SalesService.saveCustomerOrder(order);
    return reply.status(201).send(order);
  });

  // Obtener pedido de cliente para cargar en la caja (RF-25) - Público / Staff
  fastify.get('/customer-orders/:orderNumber', async (request, reply) => {
    const { orderNumber } = request.params as { orderNumber: string };
    const order = SalesService.getCustomerOrder(orderNumber);
    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        message: 'No se encontró el pedido o ya expiró',
      });
    }
    return reply.send(order);
  });

  // Marcar venta como entregada (RF-27, RN-11)
  fastify.post(
    '/verify-delivery',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = verifyDeliverySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const result = await SalesService.markAsDelivered(
          parseResult.data.numero_operacion,
          request.user.id
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al registrar la entrega',
        });
      }
    }
  );

  // Historial de ventas (RF-20)
  fastify.get(
    '/',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      const parseResult = salesListQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      const sales = await SalesService.listSales(parseResult.data);
      return reply.send(sales);
    }
  );
}
