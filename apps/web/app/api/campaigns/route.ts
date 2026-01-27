/**
 * Campaign API - POST endpoint
 *
 * Creates a new campaign for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, campaigns } from '@/lib/db';

/**
 * Zod schema for campaign creation request body
 */
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  tone: z.enum(['professional', 'friendly', 'direct']).optional(),
  cta: z.enum(['book_call', 'reply', 'visit_site']).optional(),
  calendarLink: z.string().url('Invalid calendar link URL').optional().nullable(),
  qualificationRules: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'qualificationRules must be valid JSON' }
    ),
  autoApprove: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, tone, cta, calendarLink, qualificationRules, autoApprove } =
      parsed.data;

    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId,
        name,
        tone: tone ?? 'professional',
        cta: cta ?? 'reply',
        calendarLink: calendarLink ?? null,
        qualificationRules: qualificationRules ?? null,
        autoApprove: autoApprove ?? false,
      })
      .returning();

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
