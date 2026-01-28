import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsForm } from '@/components/settings-form';

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6">
        <div className="mb-6">
          <p className="text-gray-600">
            Manage your account preferences and default settings
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <SettingsForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
