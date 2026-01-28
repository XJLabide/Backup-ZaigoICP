'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CampaignForm } from '@/components/campaign-form';

interface EditCampaignFormProps {
  campaignId: string;
  initialValues: {
    name: string;
    tone: 'professional' | 'friendly' | 'direct';
    cta: 'book_call' | 'reply' | 'visit_site';
    calendarLink: string;
    autoApprove: boolean;
  };
}

export function EditCampaignForm({
  campaignId,
  initialValues,
}: EditCampaignFormProps) {
  const router = useRouter();

  const handleSubmit = async (values: {
    name: string;
    tone: 'professional' | 'friendly' | 'direct';
    cta: 'book_call' | 'reply' | 'visit_site';
    calendarLink?: string;
    autoApprove: boolean;
  }) => {
    const response = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...values,
        calendarLink: values.calendarLink || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update campaign');
    }

    toast.success('Campaign updated successfully');
    router.push(`/dashboard/campaigns/${campaignId}`);
    router.refresh();
  };

  return (
    <CampaignForm
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
    />
  );
}
