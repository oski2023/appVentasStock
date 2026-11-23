import { z } from 'zod';

export const createAdjustmentSchema = z.object({
  variant_id: z.string().uuid('ID de variante inválido'),
  tipo: z.enum(['ingreso', 'egreso', 'rotura', 'ajuste'], {
    errorMap: () => ({ message: 'El tipo debe ser ingreso, egreso, rotura o ajuste' }),
  }),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo mayor a cero'),
  motivo: z.string().min(4, 'El motivo del ajuste es obligatorio y debe tener al menos 4 caracteres'),
  referencia: z.string().optional(),
});

export const inventoryMovementsQuerySchema = z.object({
  variant_id: z.string().uuid().optional(),
  tipo: z.enum(['venta', 'ingreso', 'egreso', 'devolucion', 'rotura', 'ajuste', 'inventario_inicial']).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().default(30),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const inventoryStockQuerySchema = z.object({
  query: z.string().optional(),
  bajo_stock: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type InventoryMovementsQuery = z.infer<typeof inventoryMovementsQuerySchema>;
export type InventoryStockQuery = z.infer<typeof inventoryStockQuerySchema>;
