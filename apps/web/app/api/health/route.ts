import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// CRITICAL: Prevent caching of health checks
export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Test database connectivity
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp,
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        db: 'disconnected',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
