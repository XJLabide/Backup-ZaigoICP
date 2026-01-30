'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const campaignFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  tone: z.enum(['professional', 'friendly', 'direct']),
  cta: z.enum(['book_call', 'reply', 'visit_site']),
  calendarLink: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  autoApprove: z.boolean(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  initialValues?: Partial<CampaignFormValues>;
  onSubmit?: (values: CampaignFormValues) => Promise<void>;
  submitLabel?: string;
}

export function CampaignForm({
  initialValues,
  onSubmit,
  submitLabel = 'Create Campaign',
}: CampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      tone: initialValues?.tone ?? 'professional',
      cta: initialValues?.cta ?? 'reply',
      calendarLink: initialValues?.calendarLink ?? '',
      autoApprove: initialValues?.autoApprove ?? false,
    },
  });

  const handleSubmit = async (values: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(values);
        return;
      }

      // Default behavior: create new campaign
      const response = await fetch('/api/campaigns', {
        method: 'POST',
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
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const data = await response.json();
      toast.success('Campaign created successfully');
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Q1 Outreach Campaign"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone">Message Tone</Label>
        <Select
          value={form.watch('tone')}
          onValueChange={(value) =>
            form.setValue('tone', value as CampaignFormValues['tone'])
          }
        >
          <SelectTrigger id="tone">
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Sets the tone for AI-generated messages
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cta">Call to Action</Label>
        <Select
          value={form.watch('cta')}
          onValueChange={(value) =>
            form.setValue('cta', value as CampaignFormValues['cta'])
          }
        >
          <SelectTrigger id="cta">
            <SelectValue placeholder="Select CTA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reply">Request a Reply</SelectItem>
            <SelectItem value="book_call">Book a Call</SelectItem>
            <SelectItem value="visit_site">Visit Site</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          The action you want prospects to take
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="calendarLink">Calendar Link (optional)</Label>
        <Input
          id="calendarLink"
          placeholder="https://calendly.com/your-link"
          {...form.register('calendarLink')}
        />
        {form.formState.errors.calendarLink && (
          <p className="text-sm text-red-500">
            {form.formState.errors.calendarLink.message}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Used when CTA is &quot;Book a Call&quot;
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="autoApprove"
          checked={form.watch('autoApprove')}
          onCheckedChange={(checked) =>
            form.setValue('autoApprove', checked === true)
          }
        />
        <div className="space-y-1">
          <Label htmlFor="autoApprove" className="cursor-pointer">
            Auto-approve messages
          </Label>
          <p className="text-xs text-gray-500">
            Skip manual review for AI-generated messages
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
