'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignForm } from '@/components/campaign-form';
import { Sparkles } from 'lucide-react';

type CampaignFormValues = {
  name: string;
  tone: 'professional' | 'friendly' | 'direct';
  cta: 'book_call' | 'reply' | 'visit_site';
  calendarLink: string;
  productCategory: string;
  valueProposition: string;
  talkingPoints: string;
  personalizationOptions: {
    referenceCompany: boolean;
    mentionMutuals: boolean;
    industrySpecific: boolean;
    keepBrief: boolean;
  };
  autoApprove: boolean;
};

function MessagePreview({ values }: { values: Partial<CampaignFormValues> }) {
  const getTemplateMessage = () => {
    const tone = values.tone || 'professional';
    const greeting = tone === 'friendly' ? 'Hi John!' : 'Hi John,';

    let opening = "I came across your profile and was impressed by your background.";
    if (values.personalizationOptions?.referenceCompany) {
      opening = "I noticed you're leading Acme Manufacturing - impressive growth in the sector.";
    }

    const body = values.valueProposition ||
      "I help business owners protect their families and reduce tax burden through tailored strategies.";

    let closing = "Would love to connect and share some insights.";
    if (values.cta === 'book_call') {
      closing = "Would you be open to a quick call this week?";
    } else if (values.cta === 'visit_site') {
      closing = "Would love to connect and learn more about your work.";
    }

    const signoff = tone === 'friendly' ? 'Looking forward to connecting!' : 'Best regards,';

    if (values.personalizationOptions?.keepBrief) {
      return `${greeting}\n\n${opening}\n\n${closing}\n\n${signoff}`;
    }

    return `${greeting}\n\n${opening}\n\n${body}\n\n${closing}\n\n${signoff}`;
  };

  const displayMessage = getTemplateMessage();
  const wordCount = displayMessage.split(/\s+/).filter(Boolean).length;

  return (
    <div className="sticky top-6">
      <Card className="border-primary/20 shadow-lg shadow-primary/5">
        <CardHeader className="border-b border-primary/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Message Preview</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Preview how your messages will look
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Sample Prospect Card */}
          <div className="mb-6 flex items-start gap-4 rounded-lg bg-background/50 p-4 border border-border">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold">
              JS
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">John Smith</h4>
              <p className="text-sm text-muted-foreground">CEO at Acme Manufacturing</p>
              <p className="text-xs text-muted-foreground mt-1">Manufacturing • Dallas, TX</p>
            </div>
          </div>

          {/* Message Bubble */}
          <div className="relative">
            <div className="rounded-2xl bg-card border border-primary/20 p-5 shadow-sm">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {displayMessage}
              </div>
            </div>

            {/* Message metadata */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Template Preview
              </span>
              <span>•</span>
              <span>{wordCount} words</span>
              {values.personalizationOptions?.keepBrief && wordCount > 50 && (
                <>
                  <span>•</span>
                  <span className="text-yellow-500">Brief mode active</span>
                </>
              )}
            </div>
          </div>

          {/* Style indicators */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {values.tone || 'professional'} tone
              </span>
              {values.productCategory && (
                <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground/80 capitalize">
                  {values.productCategory.replace(/_/g, ' ')}
                </span>
              )}
              {values.personalizationOptions?.referenceCompany && (
                <span className="inline-flex items-center rounded-full bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Company personalization
                </span>
              )}
              {values.personalizationOptions?.industrySpecific && (
                <span className="inline-flex items-center rounded-full bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Industry-specific
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewCampaignPage() {
  const [formValues, setFormValues] = useState<Partial<CampaignFormValues>>({
    tone: 'professional',
    cta: 'reply',
    personalizationOptions: {
      referenceCompany: true,
      mentionMutuals: false,
      industrySpecific: true,
      keepBrief: false,
    },
  });

  return (
    <div>
      <Header title="Create Campaign" />
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form Column - 3/5 width */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>New Campaign</CardTitle>
                  <CardDescription>
                    Set up a new outreach campaign with AI-powered message
                    generation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignForm onValuesChange={setFormValues} />
                </CardContent>
              </Card>
            </div>

            {/* Preview Column - 2/5 width */}
            <div className="lg:col-span-2">
              <MessagePreview values={formValues} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
