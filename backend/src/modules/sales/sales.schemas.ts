import { z } from 'zod';

export const assistedSaleItemSchema = z.object({
  variant_id: z.string().uuid('ID de variante no válido'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo mayor a cero'),
});

export const manualPaymentSchema = z.object({
  medio: z.enum(['efectivo', 'transferencia', 'posnet'], {
    errorMap: () => ({ message: 'El medio de pago debe ser efectivo, transferencia o posnet' }),
  }),
  importe_recibido: z.number().positive('El importe recibido debe ser mayor a cero').optional(),
  referencia_externa: z.string().optional(),
});

export const createAssistedSaleSchema = z.object({
  items: z.array(assistedSaleItemSchema).min(1, 'La venta debe contener al menos un producto'),
  pago: manualPaymentSchema,
  marcar_entregada: z.boolean().default(true), // Por defecto en venta asistida de mostrador se entrega
  customer: z
    .object({
      nombre: z.string().optional(),
      email: z.string().email('Email no válido').optional(),
      telefono: z.string().optional(),
    })
    .optional(),
});

export const verifyDeliverySchema = z.object({
  numero_operacion: z.string().min(1, 'El número de operación es obligatorio'),
});

export const salesListQuerySchema = z.object({
  estado: z
    .enum(['pendiente_pago', 'pagada', 'pagada_sin_stock', 'entregada', 'cancelada', 'devuelta'])
    .optional(),
  vendedor_id: z.string().uuid().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateAssistedSaleInput = z.infer<typeof createAssistedSaleSchema>;
export type VerifyDeliveryInput = z.infer<typeof verifyDeliverySchema>;
export type SalesListQuery = z.infer<typeof salesListQuerySchema>;
