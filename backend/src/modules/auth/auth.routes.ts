import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { loginSchema, seedAdminSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

export async function authRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Iniciar sesión
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Datos de inicio de sesión inválidos',
        detalles: parseResult.error.errors,
      });
    }

    try {
      const user = await AuthService.login(parseResult.data);
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Credenciales inválidas (email o contraseña incorrectos)',
        });
      }

      // Generar JWT
      const token = fastify.jwt.sign(
        {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '8h' }
      );

      return reply.send({
        message: 'Inicio de sesión exitoso',
        token,
        usuario: user,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: error.message || 'Error al procesar el inicio de sesión',
      });
    }
  });

  // Consultar perfil del usuario autenticado
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await AuthService.getUserById(request.user.id);
    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Usuario no encontrado',
      });
    }

    return reply.send({ usuario: user });
  });

  // Semillar el primer administrador (solo permitido si la base de datos no tiene usuarios)
  fastify.post('/seed-admin', async (request, reply) => {
    const parseResult = seedAdminSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Datos de registro inválidos',
        detalles: parseResult.error.errors,
      });
    }

    try {
      const admin = await AuthService.seedAdmin(parseResult.data);
      return reply.status(201).send({
        message: 'Administrador inicial creado exitosamente',
        usuario: admin,
      });
    } catch (error: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });
}
