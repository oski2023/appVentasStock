import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { printLabelsSchema } from './labels.schemas.js';
import { LabelsService } from './labels.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function labelsRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Generar y descargar PDF de etiquetas para hoja A4 (24 etiquetas de 70x37 mm) (RF-30, CP-19)
  fastify.post(
    '/pdf',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const parseResult = printLabelsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }

      try {
        const pdfBuffer = await LabelsService.generateLabelsPdf(
          parseResult.data,
          request.user.id
        );

        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', 'attachment; filename="etiquetas_a4.pdf"')
          .send(pdfBuffer);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: error.message || 'Error al generar el documento PDF de etiquetas',
        });
      }
    }
  );

  // Listar variantes con etiquetas desactualizadas por cambio de precio (RN-15, CP-14)
  fastify.get(
    '/outdated',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (_request, reply) => {
      const outdated = await LabelsService.listOutdatedLabels();
      return reply.send(outdated);
    }
  );
}
