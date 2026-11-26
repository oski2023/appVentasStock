import { z } from 'zod';

export const importRowSchema = z.object({
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  producto: z.string().min(1, 'El nombre del producto es obligatorio'),
  descripcion: z.string().optional(),
  imagen: z.string().optional(),
  imagenes: z.string().optional(),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  modelo: z.string().optional(),
  talle: z.string().optional(),
  color: z.string().optional(),
  precio: z.coerce.number().min(0, 'El precio debe ser un número igual o mayor a cero'),
  stock_actual: z.coerce.number().int().min(0, 'El stock inicial debe ser mayor o igual a cero').default(0),
  stock_minimo: z.coerce.number().int().min(0, 'El stock mínimo debe ser mayor o igual a cero').default(5),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;
