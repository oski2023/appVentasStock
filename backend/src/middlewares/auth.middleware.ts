import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';

export interface TokenPayload {
  id: string;
  nombre: string;
  email: string;
  role: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

/**
 * Middleware para validar el JWT y extraer el usuario autenticado.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticación no válido o ausente',
    });
  }
}

/**
 * Middleware de autorización basado en roles (RBAC).
 */
export function authorizeRoles(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No posee los permisos necesarios para realizar esta acción',
      });
    }
  };
}
