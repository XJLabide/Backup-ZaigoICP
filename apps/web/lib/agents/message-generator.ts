/**
 * AI Message Generator Module
 *
 * Generates personalized LinkedIn connection request messages using
 * Vercel AI SDK with Claude Sonnet.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * Lead profile data used for message generation
 */
export interface LeadProfile {
  firstName: string | null;
  headline: string | null;
  company: string | null;
  recentPost: string | null;
  about: string | null;
}

/**
 * Campaign settings that influence message generation
 */
export interface CampaignSettings {
  tone: "professional" | "friendly" | "direct";
  cta: "book_call" | "reply" | "visit_site";
  calendarLink: string | null;
}

/**
 * Result of message generation
 */
export interface GeneratedMessage {
  /** The generated message text */
  message: string;
  /** Signals from lead profile that were referenced */
  usedSignals: string[];
  /** Token usage from the AI call */
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Configuration for message generation
 */
interface GenerateMessageConfig {
  lead: LeadProfile;
  campaign: CampaignSettings;
  /** Optional user name to personalize the sender context */
  userName?: string;
}

/**
 * Builds the prompt for message generation
 */
function buildPrompt(config: GenerateMessageConfig): string {
  const { lead, campaign, userName = "the user" } = config;

  // Build lead info section, handling missing fields gracefully
  const leadInfoParts: string[] = [];
  if (lead.firstName) {
    leadInfoParts.push(`- Name: ${lead.firstName}`);
  }
  if (lead.headline) {
    leadInfoParts.push(`- Headline: ${lead.headline}`);
  }
  if (lead.company) {
    leadInfoParts.push(`- Company: ${lead.company}`);
  }
  if (lead.recentPost) {
    leadInfoParts.push(`- Recent activity: ${lead.recentPost}`);
  }
  if (lead.about) {
    leadInfoParts.push(`- About: ${lead.about}`);
  }

  const leadInfo =
    leadInfoParts.length > 0
      ? leadInfoParts.join("\n")
      : "- Limited profile information available";

  // Determine if calendar link should be included
  const calendarInstruction =
    campaign.cta === "book_call" && campaign.calendarLink
      ? `- Include this calendar link naturally: ${campaign.calendarLink}`
      : "- Do NOT include any calendar or meeting links";

  return `You are writing a LinkedIn connection request for ${userName}.

Lead info:
${leadInfo}

Campaign settings:
- Tone: ${campaign.tone}
- Goal: ${campaign.cta}
${calendarInstruction}

Rules:
- Keep under 300 characters (LinkedIn limit for connection notes)
- Reference something specific from their profile if available
- Match the requested tone
- Never be pushy or salesy
- Sound like a real human, not a template
- If profile info is limited, write a genuine professional introduction

Write a personalized connection request message. Output ONLY the message text, no quotes or explanation.`;
}

/**
 * Extracts which lead signals were used in the message
 */
function extractUsedSignals(
  message: string,
  lead: LeadProfile
): string[] {
  const signals: string[] = [];

  if (lead.firstName && message.toLowerCase().includes(lead.firstName.toLowerCase())) {
    signals.push("firstName");
  }
  if (lead.headline && containsReference(message, lead.headline)) {
    signals.push("headline");
  }
  if (lead.company && containsReference(message, lead.company)) {
    signals.push("company");
  }
  if (lead.recentPost && containsReference(message, lead.recentPost)) {
    signals.push("recentPost");
  }
  if (lead.about && containsReference(message, lead.about)) {
    signals.push("about");
  }

  return signals;
}

/**
 * Checks if the message references content from a profile field
 */
function containsReference(message: string, fieldContent: string): boolean {
  const messageLower = message.toLowerCase();
  // Extract significant words (3+ chars) from the field
  const words = fieldContent
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // Check if any significant words appear in the message
  return words.some((word) => messageLower.includes(word));
}

/**
 * Generates a personalized LinkedIn connection request message using AI.
 *
 * @param config - Lead profile and campaign settings
 * @returns Generated message with metadata
 * @throws Error if AI generation fails
 *
 * @example
 * ```typescript
 * const result = await generateMessage({
 *   lead: {
 *     firstName: "John",
 *     headline: "Software Engineer at Acme",
 *     company: "Acme Corp",
 *     recentPost: null,
 *     about: "Building great products",
 *   },
 *   campaign: {
 *     tone: "professional",
 *     cta: "reply",
 *     calendarLink: null,
 *   },
 * });
 * console.log(result.message);
 * ```
 */
export async function generateMessage(
  config: GenerateMessageConfig
): Promise<GeneratedMessage> {
  const prompt = buildPrompt(config);

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    prompt,
    temperature: 0.7,
    maxOutputTokens: 500,
  });

  // Clean up the message - remove quotes if AI wrapped it
  let message = text.trim();
  if (
    (message.startsWith('"') && message.endsWith('"')) ||
    (message.startsWith("'") && message.endsWith("'"))
  ) {
    message = message.slice(1, -1);
  }

  // Extract which signals were used
  const usedSignals = extractUsedSignals(message, config.lead);

  // Calculate total tokens (handle potential undefined values)
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  return {
    message,
    usedSignals,
    tokenUsage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}

// Export for testing
export { buildPrompt, extractUsedSignals };
