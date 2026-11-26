import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SERVER_ID: z.string().uuid().optional(),

    SUPABASE_JWT_SECRET: z.string().min(32).optional(),
    SUPABASE_JWKS_URL: z.string().url().optional(),
    SUPABASE_JWT_ISSUER: z.string().min(1).optional(),
    SUPABASE_JWT_AUDIENCE: z.string().min(1).optional(),

    DEV_AUTH_ENABLED: booleanString.default('false'),
    DEV_JWT_SECRET: z.string().min(32).optional(),

    HELLO_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    DEAD_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
    RECONNECT_GRACE_MS: z.coerce.number().int().positive().default(120000),
    TICK_RATE_HZ: z.coerce.number().int().min(1).max(60).default(20),
    MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).max(1048576).default(8192),
    MAX_PLAYERS: z.coerce.number().int().min(1).max(10).default(10),
    ALLOWED_ORIGINS: z.string().optional(),
    METRICS_ENABLED: booleanString.optional(),
  })
  .superRefine((value, context) => {
    if (value.DEAD_TIMEOUT_MS <= value.HEARTBEAT_INTERVAL_MS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEAD_TIMEOUT_MS'],
        message: 'DEAD_TIMEOUT_MS must be greater than HEARTBEAT_INTERVAL_MS',
      });
    }

    if (value.DEV_AUTH_ENABLED && !value.DEV_JWT_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEV_JWT_SECRET'],
        message: 'DEV_JWT_SECRET is required when DEV_AUTH_ENABLED is true',
      });
    }

    if (value.DEV_AUTH_ENABLED && value.NODE_ENV === 'production') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEV_AUTH_ENABLED'],
        message: 'Development auth must be disabled in production',
      });
    }

    const hasSupabaseVerifier = Boolean(value.SUPABASE_JWT_SECRET || value.SUPABASE_JWKS_URL);
    const hasDevVerifier = Boolean(value.DEV_AUTH_ENABLED && value.DEV_JWT_SECRET);
    if (!hasSupabaseVerifier && !hasDevVerifier) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_JWT_SECRET'],
        message:
          'Configure SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL, or enable DEV_AUTH_ENABLED with DEV_JWT_SECRET',
      });
    }

    if (value.NODE_ENV === 'production' && !value.SERVER_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SERVER_ID'],
        message: 'SERVER_ID is required in production so clients reconnect to the same world',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
