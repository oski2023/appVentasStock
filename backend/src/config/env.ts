import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ventas_stock?sslmode=disable'),
  JWT_SECRET: z.string().min(16).default('desarrollo_secreto_super_seguro_min_16_caracteres_2026'),
  APP_BASE_URL: z.string().default('https://employ-breed-load-width.trycloudflare.com'),
});

export const env = envSchema.parse(process.env);
