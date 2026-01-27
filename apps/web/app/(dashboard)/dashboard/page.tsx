import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">Profile viewers today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">of 25 daily limit</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Welcome! Connect your LinkedIn account to start capturing profile viewers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
