-- Migration: Add lock tracking to processed_webhooks
-- This enables proper handling of in-progress events and stale lock recovery

-- Add created_at column for tracking when the lock was acquired
ALTER TABLE "processed_webhooks" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;

-- Make processed_at nullable to distinguish "in progress" (null) from "completed" (set)
ALTER TABLE "processed_webhooks" ALTER COLUMN "processed_at" DROP NOT NULL;
ALTER TABLE "processed_webhooks" ALTER COLUMN "processed_at" DROP DEFAULT;
