import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignForm } from '@/components/campaign-form';

export default function NewCampaignPage() {
  return (
    <div>
      <Header title="Create Campaign" />
      <div className="p-6">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>New Campaign</CardTitle>
              <CardDescription>
                Set up a new outreach campaign with AI-powered message
                generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
