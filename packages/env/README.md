# Env Package

## Overview

The `env` package is a utility for loading and validating environment variables in our marketing campaign automation system. It combines `dotenv` for loading variables from a `.env` file, `dotenv-expanded` for variable expansion and `zod` for schema validation, providing:

- Type-safe access to validated environment variables
- Automatic exit with error message if validation fails

## Usage

Import and use in any app/package:

```typescript
import { loadEnv } from '@strapex/env';
import { z } from 'zod';

const schema = z.object({
  API_KEY: z.string(),
  DEBUG: z.string().transform(v => v === 'true'),
});

const env = loadEnv(schema);

console.log(env.API_KEY); // Typed as string
console.log(env.DEBUG); // Typed as boolean
```

## API

### `loadEnv<T extends ZodSchema>(schema: T, filePath?: string): z.infer<T>`

Loads and validates environment variables against the provided Zod schema.

- `schema`: Zod schema defining expected environment variables and their types.
- `filePath`: (Optional) Path to the `.env` file. Defaults to `.env` in the current directory.
- Returns: Object with validated environment variables, typed according to the schema.

Exits the process with an error message if validation fails.
