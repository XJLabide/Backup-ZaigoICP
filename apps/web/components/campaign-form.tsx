'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  productCategory: z.string().max(100).optional().or(z.literal('')),
  valueProposition: z.string().max(1000).optional().or(z.literal('')),
  talkingPoints: z.string().max(1000).optional().or(z.literal('')),
  personalizationOptions: z.object({
    referenceCompany: z.boolean(),
    mentionMutuals: z.boolean(),
    industrySpecific: z.boolean(),
    keepBrief: z.boolean(),
  }).optional(),
  autoApprove: z.boolean(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  initialValues?: Partial<CampaignFormValues>;
  onSubmit?: (values: CampaignFormValues) => Promise<void>;
  submitLabel?: string;
  onValuesChange?: (values: Partial<CampaignFormValues>) => void;
}

export function CampaignForm({
  initialValues,
  onSubmit,
  submitLabel = 'Create Campaign',
  onValuesChange,
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
      productCategory: initialValues?.productCategory ?? '',
      valueProposition: initialValues?.valueProposition ?? '',
      talkingPoints: initialValues?.talkingPoints ?? '',
      personalizationOptions: initialValues?.personalizationOptions ?? {
        referenceCompany: true,
        mentionMutuals: false,
        industrySpecific: true,
        keepBrief: false,
      },
      autoApprove: initialValues?.autoApprove ?? false,
    },
  });

  // Subscribe to form changes and notify parent
  useEffect(() => {
    if (!onValuesChange) return;

    const subscription = form.watch((values) => {
      onValuesChange(values as Partial<CampaignFormValues>);
    });

    // Call immediately with current values
    onValuesChange(form.getValues());

    return () => subscription.unsubscribe();
  }, [form, onValuesChange]);

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
          productCategory: values.productCategory || null,
          valueProposition: values.valueProposition || null,
          talkingPoints: values.talkingPoints || null,
          personalizationOptions: values.personalizationOptions || null,
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

      {/* What You're Offering */}
      <div className="space-y-2">
        <Label htmlFor="productCategory">What You're Offering *</Label>
        <Select
          value={form.watch('productCategory') || ''}
          onValueChange={(value) => form.setValue('productCategory', value)}
        >
          <SelectTrigger id="productCategory">
            <SelectValue placeholder="Select your product/service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="life_insurance">Life Insurance</SelectItem>
            <SelectItem value="property_casualty">Property & Casualty</SelectItem>
            <SelectItem value="group_benefits">Group Benefits</SelectItem>
            <SelectItem value="retirement">Retirement Planning</SelectItem>
            <SelectItem value="wealth_management">Wealth Management</SelectItem>
            <SelectItem value="business_insurance">Business Insurance</SelectItem>
            <SelectItem value="health_insurance">Health Insurance</SelectItem>
            <SelectItem value="financial_planning">Financial Planning</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          The product or service you're reaching out about
        </p>
      </div>

      {/* Value Proposition */}
      <div className="space-y-2">
        <Label htmlFor="valueProposition">Your Value Proposition *</Label>
        <Textarea
          id="valueProposition"
          placeholder="e.g., I help business owners protect their families and reduce tax burden through tailored life insurance strategies"
          className="min-h-[80px] resize-none"
          {...form.register('valueProposition')}
        />
        {form.formState.errors.valueProposition && (
          <p className="text-sm text-red-500">
            {form.formState.errors.valueProposition.message}
          </p>
        )}
        <p className="text-xs text-gray-500">
          What's the main benefit you provide to clients?
        </p>
      </div>

      {/* Key Talking Points */}
      <div className="space-y-2">
        <Label htmlFor="talkingPoints">Key Talking Points (optional)</Label>
        <Textarea
          id="talkingPoints"
          placeholder="e.g., 20+ years experience, local to Dallas area, specialize in manufacturing sector"
          className="min-h-[80px] resize-none"
          {...form.register('talkingPoints')}
        />
        <p className="text-xs text-gray-500">
          Specific things you want mentioned in messages
        </p>
      </div>

      {/* Personalization Style */}
      <div className="space-y-3">
        <Label>Personalization Style</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="referenceCompany"
              checked={form.watch('personalizationOptions.referenceCompany') ?? true}
              onCheckedChange={(checked) =>
                form.setValue('personalizationOptions.referenceCompany', checked === true)
              }
            />
            <Label htmlFor="referenceCompany" className="cursor-pointer font-normal">
              Reference their company/role
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mentionMutuals"
              checked={form.watch('personalizationOptions.mentionMutuals') ?? false}
              onCheckedChange={(checked) =>
                form.setValue('personalizationOptions.mentionMutuals', checked === true)
              }
            />
            <Label htmlFor="mentionMutuals" className="cursor-pointer font-normal">
              Mention mutual connections
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="industrySpecific"
              checked={form.watch('personalizationOptions.industrySpecific') ?? true}
              onCheckedChange={(checked) =>
                form.setValue('personalizationOptions.industrySpecific', checked === true)
              }
            />
            <Label htmlFor="industrySpecific" className="cursor-pointer font-normal">
              Industry-specific approach
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="keepBrief"
              checked={form.watch('personalizationOptions.keepBrief') ?? false}
              onCheckedChange={(checked) =>
                form.setValue('personalizationOptions.keepBrief', checked === true)
              }
            />
            <Label htmlFor="keepBrief" className="cursor-pointer font-normal">
              Keep it brief (under 100 words)
            </Label>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          How the AI should personalize your messages
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
