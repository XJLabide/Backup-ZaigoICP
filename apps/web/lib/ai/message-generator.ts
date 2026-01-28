/**
 * AI Message Generator for LinkedIn connection requests.
 *
 * Uses Vercel AI SDK with Claude to generate personalized messages
 * based on lead profile data and campaign settings.
 *
 * @see docs/mvp-overview.md for message generation specs
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// =============================================================================
// Types
// =============================================================================

export interface LeadContext {
  firstName: string;
  lastName?: string;
  headline?: string;
  company?: string;
  recentPost?: string;
  mutualConnections?: number;
}

export interface CampaignContext {
  tone: 'professional' | 'friendly' | 'direct';
  cta: 'book_call' | 'reply' | 'visit_site';
  calendarLink?: string;
  userName: string;
}

export interface GeneratedMessage {
  message: string;
  qualityScore: number;
  issues: string[];
  usedSignals: string[];
}

// =============================================================================
// Spam Phrases Detection
// =============================================================================

const SPAM_PHRASES = [
  'synergy',
  'circle back',
  'touch base',
  'pick your brain',
  'quick call',
  'hop on a call',
  'game changer',
  'revolutionary',
  'guaranteed',
  'limited time',
  'act now',
  'don\'t miss',
  'exclusive offer',
  'free consultation',
];

function containsSpamPhrases(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  return SPAM_PHRASES.filter(phrase => lowerMessage.includes(phrase));
}

// =============================================================================
// Quality Scoring
// =============================================================================

interface QualityCheck {
  score: number;
  issues: string[];
}

function checkMessageQuality(
  message: string,
  lead: LeadContext,
  campaign: CampaignContext
): QualityCheck {
  let score = 100;
  const issues: string[] = [];

  // Check length constraints
  if (message.length < 50) {
    score -= 30;
    issues.push('Message too short (under 50 characters)');
  }
  if (message.length > 300) {
    score -= 20;
    issues.push('Message too long (over 300 characters - LinkedIn limit)');
  }

  // Check for first name usage
  if (!message.toLowerCase().includes(lead.firstName.toLowerCase())) {
    score -= 20;
    issues.push('Missing first name personalization');
  }

  // Check for profile detail reference
  const hasProfileDetail =
    (lead.headline && message.toLowerCase().includes(lead.headline.toLowerCase().split(' ')[0])) ||
    (lead.company && message.toLowerCase().includes(lead.company.toLowerCase())) ||
    (lead.recentPost && message.length > 100); // Assume longer messages reference posts

  if (!hasProfileDetail) {
    score -= 25;
    issues.push('No specific profile detail referenced');
  }

  // Check for spam phrases
  const spamFound = containsSpamPhrases(message);
  if (spamFound.length > 0) {
    score -= 30;
    issues.push(`Spam phrases detected: ${spamFound.join(', ')}`);
  }

  // Check for meeting request without book_call CTA
  const meetingPhrases = ['meeting', 'call', 'chat', 'coffee', 'catch up'];
  const hasMeetingRequest = meetingPhrases.some(phrase =>
    message.toLowerCase().includes(phrase)
  );
  if (hasMeetingRequest && campaign.cta !== 'book_call') {
    score -= 15;
    issues.push('Asks for meeting but CTA is not book_call');
  }

  return { score: Math.max(0, score), issues };
}

// =============================================================================
// Signal Detection
// =============================================================================

function detectUsedSignals(
  message: string,
  lead: LeadContext,
  campaign: CampaignContext
): string[] {
  const signals: string[] = [];

  if (message.toLowerCase().includes(lead.firstName.toLowerCase())) {
    signals.push('first_name');
  }
  if (lead.headline && message.toLowerCase().includes(lead.headline.toLowerCase().split(' ')[0])) {
    signals.push('headline');
  }
  if (lead.company && message.toLowerCase().includes(lead.company.toLowerCase())) {
    signals.push('company');
  }
  if (lead.recentPost && message.length > 150) {
    signals.push('recent_post');
  }
  if (lead.mutualConnections && message.toLowerCase().includes('mutual')) {
    signals.push('mutual_connections');
  }
  if (campaign.calendarLink && message.includes(campaign.calendarLink)) {
    signals.push('calendar_link');
  }

  return signals;
}

// =============================================================================
// Prompt Builder
// =============================================================================

function buildPrompt(lead: LeadContext, campaign: CampaignContext): string {
  const ctaInstructions = {
    book_call: campaign.calendarLink
      ? `Include this calendar link naturally: ${campaign.calendarLink}`
      : 'Suggest scheduling a call',
    reply: 'Ask a thoughtful question to encourage a reply',
    visit_site: 'Keep it conversational without pushing to a website',
  };

  const toneGuidelines = {
    professional: 'Formal but warm, business-appropriate language',
    friendly: 'Casual and approachable, like messaging a potential friend',
    direct: 'Brief and to the point, no fluff',
  };

  return `You are writing a LinkedIn connection request for ${campaign.userName}.

Lead info:
- Name: ${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}
- Headline: ${lead.headline || 'Not available'}
- Company: ${lead.company || 'Not available'}
- Recent activity: ${lead.recentPost || 'Not available'}
${lead.mutualConnections ? `- Mutual connections: ${lead.mutualConnections}` : ''}

Campaign settings:
- Tone: ${campaign.tone} (${toneGuidelines[campaign.tone]})
- Goal: ${campaign.cta}
- ${ctaInstructions[campaign.cta]}

Rules:
- Keep under 300 characters (LinkedIn limit for connection notes)
- Reference something specific from their profile
- Match the requested tone exactly
- Never be pushy or salesy
- Sound like a real human, not a template
- Don't use phrases like "synergy", "touch base", "pick your brain"
- Start with their name

Write a personalized connection request message. Output ONLY the message text, nothing else.`;
}

// =============================================================================
// Main Generator
// =============================================================================

/**
 * Generates a personalized LinkedIn connection request message.
 *
 * @param lead - Lead profile information
 * @param campaign - Campaign settings (tone, CTA, etc.)
 * @returns Generated message with quality score and metadata
 *
 * @example
 * const result = await generateMessage(
 *   { firstName: 'Sarah', headline: 'VP Engineering at Stripe', company: 'Stripe' },
 *   { tone: 'friendly', cta: 'reply', userName: 'John' }
 * );
 * console.log(result.message); // "Hey Sarah! Saw you're..."
 * console.log(result.qualityScore); // 85
 */
export async function generateMessage(
  lead: LeadContext,
  campaign: CampaignContext
): Promise<GeneratedMessage> {
  const prompt = buildPrompt(lead, campaign);

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt,
    maxTokens: 200,
    temperature: 0.7,
  });

  const message = text.trim();
  const { score, issues } = checkMessageQuality(message, lead, campaign);
  const usedSignals = detectUsedSignals(message, lead, campaign);

  return {
    message,
    qualityScore: score,
    issues,
    usedSignals,
  };
}

/**
 * Regenerates a message if the quality score is below threshold.
 * Will attempt up to maxRetries times to get a passing score.
 *
 * @param lead - Lead profile information
 * @param campaign - Campaign settings
 * @param minScore - Minimum acceptable quality score (default: 60)
 * @param maxRetries - Maximum regeneration attempts (default: 3)
 */
export async function generateMessageWithRetry(
  lead: LeadContext,
  campaign: CampaignContext,
  minScore: number = 60,
  maxRetries: number = 3
): Promise<GeneratedMessage> {
  let bestResult: GeneratedMessage | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await generateMessage(lead, campaign);

    if (!bestResult || result.qualityScore > bestResult.qualityScore) {
      bestResult = result;
    }

    if (result.qualityScore >= minScore) {
      return result;
    }
  }

  // Return best attempt even if below threshold
  return bestResult!;
}
