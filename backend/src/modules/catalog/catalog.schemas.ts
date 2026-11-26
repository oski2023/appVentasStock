import { z } from 'zod';

export const createCategorySchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  estado: z.boolean().optional(),
});

export const productBaseSchema = z.object({
  category_id: z.number().int().positive('La categoría es obligatoria').optional(),
  categoria_nombre: z.string().min(2, 'El nombre de la categoría debe tener al menos 2 caracteres').optional(),
  nombre: z.string().min(2, 'El nombre del producto es obligatorio'),
  descripcion: z.string().optional(),
  imagenes: z.array(z.string().url('URL de imagen no válida')).default([]),
});

export const createProductSchema = productBaseSchema.refine(
  data => data.category_id !== undefined || (data.categoria_nombre && data.categoria_nombre.trim().length >= 2),
  { message: 'Debe seleccionar una categoría existente o indicar el nombre de una nueva' }
);

export const updateProductSchema = productBaseSchema.partial().extend({
  estado: z.boolean().optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().min(2, 'El SKU es obligatorio y debe ser único'),
  modelo: z.string().optional(),
  talle: z.string().optional(),
  color: z.string().optional(),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  stock_actual: z.number().int().nonnegative('El stock no puede ser negativo').default(0),
  stock_minimo: z.number().int().nonnegative('El stock mínimo no puede ser negativo').default(5),
});

export const updateVariantSchema = z.object({
  modelo: z.string().optional(),
  talle: z.string().optional(),
  color: z.string().optional(),
  precio: z.number().nonnegative('El precio no puede ser negativo').optional(),
  stock_minimo: z.number().int().nonnegative('El stock mínimo no puede ser negativo').optional(),
  estado: z.boolean().optional(),
  etiqueta_desactualizada: z.boolean().optional(),
});

export const catalogSearchQuerySchema = z.object({
  query: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;
