import { z } from 'zod';
import { manualPaymentSchema } from '../sales/sales.schemas.js';

export const createDeferredSaleSchema = z.object({
  fecha_real: z.string().datetime({ message: 'La fecha y hora real de la venta debe estar en formato ISO válido' }),
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid('ID de variante inválido'),
        cantidad: z.number().int().positive('La cantidad debe ser mayor a cero'),
      })
    )
    .min(1, 'Debe especificar al menos un producto vendido'),
  pago: manualPaymentSchema,
  customer: z
    .object({
      nombre: z.string().optional(),
      email: z.string().email('Email no válido').optional(),
      telefono: z.string().optional(),
    })
    .optional(),
});

export type CreateDeferredSaleInput = z.infer<typeof createDeferredSaleSchema>;
