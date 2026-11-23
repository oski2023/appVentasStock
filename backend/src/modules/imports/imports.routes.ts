import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ImportsService } from './imports.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

export async function importsRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Subida de archivo CSV/Excel para importación masiva (RF-31, CA-18) - Solo Admin
  fastify.post(
    '/upload',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      // Soportar multipart/form-data
      if (request.isMultipart()) {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'No se envió ningún archivo en la solicitud',
          });
        }

        const buffer = await file.toBuffer();
        const result = await ImportsService.processImport(
          buffer,
          file.filename,
          request.user.id
        );
        return reply.status(201).send(result);
      }

      // Soportar carga mediante JSON { filename, content_base64 }
      const body = request.body as { filename?: string; content_base64?: string };
      if (body && body.filename && body.content_base64) {
        const buffer = Buffer.from(body.content_base64, 'base64');
        const result = await ImportsService.processImport(
          buffer,
          body.filename,
          request.user.id
        );
        return reply.status(201).send(result);
      }

      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Debe enviar un archivo vía multipart o un JSON con filename y content_base64',
      });
    }
  );

  // Historial de trabajos de importación
  fastify.get(
    '/jobs',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (_request, reply) => {
      const jobs = await ImportsService.listImportJobs();
      return reply.send(jobs);
    }
  );
}
