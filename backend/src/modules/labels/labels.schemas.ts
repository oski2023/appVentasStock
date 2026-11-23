import { z } from 'zod';

export const labelItemSchema = z.object({
  variant_id: z.string().uuid('ID de variante inválido'),
  copias: z.number().int().positive('La cantidad de copias debe ser al menos 1'),
});

export const printLabelsSchema = z.object({
  posicion_inicial: z
    .number()
    .int()
    .min(1, 'La posición inicial debe estar entre 1 y 24')
    .max(24, 'La posición inicial debe estar entre 1 y 24')
    .default(1),
  items: z.array(labelItemSchema).min(1, 'Debe seleccionar al menos una variante para imprimir'),
  marcar_impresas: z.boolean().default(true),
});

export type PrintLabelsInput = z.infer<typeof printLabelsSchema>;
