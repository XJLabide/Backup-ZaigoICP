export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { IcpClient } from './icp-client';

export default async function ICPPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Ideal Customer Profile</h1>
        <p className="text-gray-400 mt-2">Define who your perfect prospects are. AOG will use this to find and prioritize the right people.</p>
      </div>
      <IcpClient icpConfig={user.icpConfig} />
    </div>
  );
}
