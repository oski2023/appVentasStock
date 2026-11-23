import { z } from 'zod';

export const refundItemSchema = z.object({
  variant_id: z.string().uuid('ID de variante inválido'),
  cantidad: z.number().int().positive('La cantidad a devolver debe ser mayor a cero'),
});

export const processRefundSchema = z.object({
  numero_operacion: z.string().min(1, 'El número de operación es obligatorio'),
  items: z.array(refundItemSchema).min(1, 'Debe especificar al menos un ítem a devolver'),
  medio: z.enum(['efectivo', 'transferencia', 'cambio'], {
    errorMap: () => ({ message: 'El medio de reintegro debe ser efectivo, transferencia o cambio' }),
  }),
  referencia_externa: z.string().optional(),
  motivo: z.string().min(4, 'El motivo de la devolución es obligatorio (mínimo 4 caracteres)'),
  sin_comprobante: z.boolean().default(false),
  autorizado_por_id: z.string().uuid().optional(), // ID del administrador que autoriza en caso de ser sin comprobante
});

export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
