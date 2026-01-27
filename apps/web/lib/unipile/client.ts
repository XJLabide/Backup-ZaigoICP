/**
 * Unipile SDK client wrapper with environment validation.
 *
 * This module initializes the Unipile client for LinkedIn API access.
 * Environment variables are validated at module load time using Zod.
 */

import { UnipileClient } from 'unipile-node-sdk';
import { z } from 'zod';

// Environment variable schema - validated at module load
const envSchema = z.object({
  UNIPILE_DSN: z.string().url('UNIPILE_DSN must be a valid URL'),
  UNIPILE_ACCESS_TOKEN: z.string().min(1, 'UNIPILE_ACCESS_TOKEN is required'),
});

// Validate environment variables at startup
const env = envSchema.parse({
  UNIPILE_DSN: process.env.UNIPILE_DSN,
  UNIPILE_ACCESS_TOKEN: process.env.UNIPILE_ACCESS_TOKEN,
});

// Export configured Unipile client singleton
export const unipile = new UnipileClient(env.UNIPILE_DSN, env.UNIPILE_ACCESS_TOKEN);

// Re-export env values for use in other modules (e.g., auth link generation)
export const unipileConfig = {
  dsn: env.UNIPILE_DSN,
} as const;
