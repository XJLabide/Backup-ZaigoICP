import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db, campaigns } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EditCampaignForm } from './edit-campaign-form';

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));

  if (!campaign) {
    notFound();
  }

  return (
    <div>
      <Header title={`Edit: ${campaign.name}`} />
      <div className="p-6">
        <div className="mb-6">
          <Link href={`/dashboard/campaigns/${campaign.id}`}>
            <Button variant="ghost">&larr; Back to Campaign</Button>
          </Link>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Edit Campaign</CardTitle>
              <CardDescription>
                Update your campaign settings. Changes will take effect
                immediately for new messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditCampaignForm
                campaignId={campaign.id}
                initialValues={{
                  name: campaign.name,
                  tone: campaign.tone,
                  cta: campaign.cta,
                  calendarLink: campaign.calendarLink ?? '',
                  autoApprove: campaign.autoApprove ?? false,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
