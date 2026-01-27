/**
 * Unipile SDK client wrapper with lazy environment validation.
 *
 * This module provides a Unipile client for LinkedIn API access.
 * Environment variables are validated lazily to ensure errors are
 * caught in route handlers rather than at module import time.
 */

import { UnipileClient } from 'unipile-node-sdk';
import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  UNIPILE_DSN: z.string().url('UNIPILE_DSN must be a valid URL'),
  UNIPILE_ACCESS_TOKEN: z.string().min(1, 'UNIPILE_ACCESS_TOKEN is required'),
});

// Cached client instance
let _unipileClient: UnipileClient | null = null;
let _unipileConfig: { dsn: string } | null = null;

/**
 * Validates environment and returns config. Throws on invalid env.
 */
function validateEnv(): z.infer<typeof envSchema> {
  return envSchema.parse({
    UNIPILE_DSN: process.env.UNIPILE_DSN,
    UNIPILE_ACCESS_TOKEN: process.env.UNIPILE_ACCESS_TOKEN,
  });
}

/**
 * Gets the Unipile client instance, creating it lazily.
 * Validates environment variables on first call.
 *
 * @throws ZodError if environment variables are invalid
 */
export function getUnipileClient(): UnipileClient {
  if (!_unipileClient) {
    const env = validateEnv();
    _unipileClient = new UnipileClient(env.UNIPILE_DSN, env.UNIPILE_ACCESS_TOKEN);
    _unipileConfig = { dsn: env.UNIPILE_DSN };
  }
  return _unipileClient;
}

/**
 * Gets Unipile config, validating environment on first call.
 *
 * @throws ZodError if environment variables are invalid
 */
export function getUnipileConfig(): { dsn: string } {
  if (!_unipileConfig) {
    const env = validateEnv();
    _unipileConfig = { dsn: env.UNIPILE_DSN };
    // Also initialize client to keep them in sync
    if (!_unipileClient) {
      _unipileClient = new UnipileClient(env.UNIPILE_DSN, env.UNIPILE_ACCESS_TOKEN);
    }
  }
  return _unipileConfig;
}
