'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Common IANA timezones
const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
] as const;

const settingsFormSchema = z.object({
  calendarLink: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  dailyLimit: z
    .number()
    .int('Daily limit must be a whole number')
    .min(10, 'Daily limit must be at least 10')
    .max(50, 'Daily limit cannot exceed 50'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface UserData {
  id: string;
  email: string;
  name: string | null;
  calendarLink: string | null;
  dailyLimit: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export function SettingsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      calendarLink: '',
      dailyLimit: 25,
      timezone: 'America/Los_Angeles',
    },
  });

  useEffect(() => {
    async function fetchUserSettings() {
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          throw new Error('Failed to fetch user settings');
        }
        const data = await response.json();
        const user: UserData = data.user;

        form.reset({
          calendarLink: user.calendarLink ?? '',
          dailyLimit: user.dailyLimit,
          timezone: user.timezone,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to load user settings'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserSettings();
  }, [form]);

  const handleSubmit = async (values: SettingsFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarLink: values.calendarLink || null,
          dailyLimit: values.dailyLimit,
          timezone: values.timezone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
          Your default calendar link for scheduling calls
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dailyLimit">Daily Connection Limit</Label>
        <Input
          id="dailyLimit"
          type="number"
          min={10}
          max={50}
          {...form.register('dailyLimit', {
            valueAsNumber: true,
          })}
        />
        {form.formState.errors.dailyLimit && (
          <p className="text-sm text-red-500">
            {form.formState.errors.dailyLimit.message}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Maximum number of connection requests per day (10-50)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          value={form.watch('timezone')}
          onValueChange={(value) => form.setValue('timezone', value)}
        >
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.timezone && (
          <p className="text-sm text-red-500">
            {form.formState.errors.timezone.message}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Your timezone for scheduling and activity limits
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
