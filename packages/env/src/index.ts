import { config } from 'dotenv';
import { expand } from 'dotenv-expand'
import path from 'path';
import { z, ZodSchema } from 'zod';

export function loadEnv<T extends ZodSchema>(
  schema: T,
  filePath?: string
): z.infer<T> {
  const envPath = filePath || path.resolve(process.cwd(), '.env');

  const myEnv = config({ path: envPath });
  expand(myEnv);

  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    process.exit(1);
  }

  return result.data;
}
