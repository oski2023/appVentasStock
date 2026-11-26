import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { uploadsDir } from '../../server.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  catalogSearchQuerySchema,
} from './catalog.schemas.js';
import { CatalogService } from './catalog.service.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';

/**
 * Helper para detectar si la solicitud proviene de un usuario autenticado interno (admin o vendedor)
 */
async function checkIsInternalUser(request: FastifyRequest): Promise<boolean> {
  try {
    await request.jwtVerify();
    const role = (request.user as any)?.role;
    return role === 'admin' || role === 'vendedor';
  } catch {
    return false;
  }
}

export async function catalogRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // ===================== CATEGORÍAS =====================
  fastify.get('/categories', async (_request, reply) => {
    const categories = await CatalogService.listCategories();
    return reply.send(categories);
  });

  fastify.post(
    '/categories',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const parseResult = createCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const category = await CatalogService.createCategory(parseResult.data);
      return reply.status(201).send(category);
    }
  );

  fastify.put(
    '/categories/:id',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = updateCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const updated = await CatalogService.updateCategory(parseInt(id, 10), parseResult.data);
      if (!updated) {
        return reply.status(404).send({ statusCode: 404, message: 'Categoría no encontrada' });
      }
      return reply.send(updated);
    }
  );

  // ===================== PRODUCTOS =====================
  // Subida de imagen de producto (RF-16) - Guarda la foto en disco y devuelve la ruta
  fastify.post(
    '/upload-image',
    { preHandler: [authenticate, authorizeRoles(['admin', 'vendedor'])] },
    async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ message: 'No se envió ningún archivo de imagen' });
        }

        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(data.mimetype)) {
          return reply.status(400).send({ message: 'Formato no válido. Use JPG, PNG o WebP.' });
        }

        const ext = path.extname(data.filename) || '.jpg';
        const cleanName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const productsDir = path.resolve(uploadsDir, 'products');
        if (!fs.existsSync(productsDir)) {
          fs.mkdirSync(productsDir, { recursive: true });
        }

        const targetPath = path.join(productsDir, cleanName);
        await pipeline(data.file, fs.createWriteStream(targetPath));

        const relativeUrl = `/uploads/products/${cleanName}`;
        return reply.status(201).send({ url: relativeUrl });
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ message: 'Error al guardar la imagen en el servidor' });
      }
    }
  );

  fastify.get('/products', async (request, reply) => {
    const parseResult = catalogSearchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        detalles: parseResult.error.errors,
      });
    }

    const isInternal = await checkIsInternalUser(request);
    const products = await CatalogService.listProducts(parseResult.data, isInternal);
    return reply.send(products);
  });

  fastify.get('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const isInternal = await checkIsInternalUser(request);
    const product = await CatalogService.getProductById(id, isInternal);
    if (!product) {
      return reply.status(404).send({ statusCode: 404, message: 'Producto no encontrado' });
    }
    return reply.send(product);
  });

  fastify.post(
    '/products',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const parseResult = createProductSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const product = await CatalogService.createProduct(parseResult.data);
      return reply.status(201).send(product);
    }
  );

  fastify.put(
    '/products/:id',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = updateProductSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const updated = await CatalogService.updateProduct(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({ statusCode: 404, message: 'Producto no encontrado' });
      }
      return reply.send(updated);
    }
  );

  // ===================== VARIANTES Y CÓDIGOS QR =====================
  fastify.post(
    '/products/:productId/variants',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const { productId } = request.params as { productId: string };
      const parseResult = createVariantSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      try {
        const variant = await CatalogService.createVariant(
          productId,
          parseResult.data,
          request.user.id
        );
        return reply.status(201).send(variant);
      } catch (error: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message || 'Error al crear la variante',
        });
      }
    }
  );

  fastify.put(
    '/variants/:id',
    { preHandler: [authenticate, authorizeRoles(['admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = updateVariantSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          detalles: parseResult.error.errors,
        });
      }
      const updated = await CatalogService.updateVariant(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({ statusCode: 404, message: 'Variante no encontrada' });
      }
      return reply.send(updated);
    }
  );

  // ===================== FICHA POR CÓDIGO QR / SKU (RF-04) =====================
  fastify.get('/variants/by-code/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const isInternal = await checkIsInternalUser(request);
    const variant = await CatalogService.getVariantByCodeOrSku(code, isInternal);
    if (!variant) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No se encontró ningún producto o variante con el código escaneado',
      });
    }
    return reply.send(variant);
  });
}
