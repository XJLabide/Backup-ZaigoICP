/**
 * Quality Scorer Module
 *
 * Evaluates LinkedIn connection request messages using LLM-as-judge pattern.
 * Returns a quality score (0-100) and actionable issues array for UI display.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LeadProfile, CampaignSettings } from "./message-generator";

/**
 * Minimum quality score required for a message to pass
 */
export const MIN_QUALITY_SCORE = 60;

/**
 * Maximum character length for LinkedIn connection request messages
 */
export const MAX_CONNECTION_MESSAGE_LENGTH = 300;

/**
 * Common spam phrases to detect
 */
const SPAM_PHRASES = [
  "once in a lifetime",
  "act now",
  "limited time",
  "don't miss out",
  "exclusive opportunity",
  "guaranteed",
  "free consultation",
  "no obligation",
  "click here",
  "buy now",
  "100% free",
  "make money",
  "earn extra",
  "work from home",
  "passive income",
  "financial freedom",
  "game changer",
  "revolutionary",
  "best price",
  "special offer",
];

/**
 * Result of quality scoring
 */
export interface QualityScoreResult {
  /** Overall quality score (0-100) */
  score: number;
  /** Array of actionable issues for UI display */
  issues: string[];
  /** Breakdown of score deductions */
  breakdown: {
    lengthPenalty: number;
    personalizationPenalty: number;
    spamPenalty: number;
    ctaPenalty: number;
    llmScore: number;
  };
}

/**
 * Configuration for quality scoring
 */
export interface ScoreMessageConfig {
  /** The message to score */
  message: string;
  /** Lead profile used for personalization checks */
  lead: LeadProfile;
  /** Campaign settings to check CTA appropriateness */
  campaign: CampaignSettings;
  /** Signals that were used in the message */
  usedSignals?: string[];
}

/**
 * Performs rule-based checks on the message
 */
function performRuleBasedChecks(config: ScoreMessageConfig): {
  deductions: number;
  issues: string[];
  lengthPenalty: number;
  personalizationPenalty: number;
  spamPenalty: number;
  ctaPenalty: number;
} {
  const { message, lead, campaign, usedSignals = [] } = config;
  const issues: string[] = [];
  let deductions = 0;
  let lengthPenalty = 0;
  let personalizationPenalty = 0;
  let spamPenalty = 0;
  let ctaPenalty = 0;

  // Check message length
  if (message.length < 50) {
    lengthPenalty = 30;
    deductions += 30;
    issues.push("Message is too short (under 50 characters). Add more context to make it personal.");
  } else if (message.length > MAX_CONNECTION_MESSAGE_LENGTH) {
    lengthPenalty = 20;
    deductions += 20;
    issues.push(`Message exceeds ${MAX_CONNECTION_MESSAGE_LENGTH} character limit. LinkedIn will truncate it.`);
  }

  // Check for first name usage
  const hasFirstName = lead.firstName
    ? message.toLowerCase().includes(lead.firstName.toLowerCase())
    : false;
  if (!hasFirstName && lead.firstName) {
    personalizationPenalty += 20;
    deductions += 20;
    issues.push("Message doesn't include the recipient's name. Add their first name for a personal touch.");
  }

  // Check for profile detail reference
  const hasProfileDetail = usedSignals.some(
    (signal) => signal !== "firstName"
  );
  if (!hasProfileDetail) {
    personalizationPenalty += 25;
    deductions += 25;
    issues.push("No reference to their profile details. Mention their headline, company, or recent activity.");
  }

  // Check for spam phrases
  const messageLower = message.toLowerCase();
  const foundSpamPhrases = SPAM_PHRASES.filter((phrase) =>
    messageLower.includes(phrase)
  );
  if (foundSpamPhrases.length > 0) {
    spamPenalty = 30;
    deductions += 30;
    issues.push(`Contains spam-like phrases: "${foundSpamPhrases[0]}". Rewrite to sound more authentic.`);
  }

  // Check for inappropriate meeting request
  const asksMeeting =
    messageLower.includes("meeting") ||
    messageLower.includes("call") ||
    messageLower.includes("schedule") ||
    messageLower.includes("book") ||
    messageLower.includes("chat");
  if (asksMeeting && campaign.cta !== "book_call") {
    ctaPenalty = 15;
    deductions += 15;
    issues.push("Asks for a meeting in the first message. Focus on connecting first, schedule later.");
  }

  return {
    deductions,
    issues,
    lengthPenalty,
    personalizationPenalty,
    spamPenalty,
    ctaPenalty,
  };
}

/**
 * Builds the prompt for LLM quality evaluation
 */
function buildScoringPrompt(message: string, campaign: CampaignSettings): string {
  return `You are evaluating a LinkedIn connection request message for quality.

Message to evaluate:
"${message}"

Campaign settings:
- Tone: ${campaign.tone}
- Goal: ${campaign.cta}

Evaluate the message on a scale of 0-100 considering:
1. Authenticity: Does it sound like a real human, not a template?
2. Relevance: Is the message relevant to professional networking?
3. Clarity: Is the message clear and easy to understand?
4. Appropriateness: Is the tone and content appropriate for LinkedIn?

Respond with ONLY a JSON object in this exact format:
{"score": <number 0-100>, "reasoning": "<brief explanation>"}`;
}

/**
 * Parses LLM response to extract score
 */
function parseLLMResponse(response: string): { score: number; reasoning: string } {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 70)),
      reasoning: parsed.reasoning || "",
    };
  } catch {
    // If JSON parsing fails, try to extract a number
    const scoreMatch = response.match(/\b(\d{1,3})\b/);
    if (scoreMatch) {
      return {
        score: Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))),
        reasoning: "Score extracted from response",
      };
    }
    // Default fallback
    return { score: 70, reasoning: "Unable to parse LLM response" };
  }
}

/**
 * Scores a LinkedIn connection request message for quality.
 *
 * Uses a combination of rule-based checks and LLM evaluation:
 * 1. Rule-based checks for length, personalization, spam
 * 2. LLM evaluation for authenticity, relevance, clarity
 * 3. Combined score with deductions applied
 *
 * @param config - Message and context for scoring
 * @returns Quality score (0-100) and actionable issues array
 *
 * @example
 * ```typescript
 * const result = await scoreMessage({
 *   message: "Hi John, I noticed your work at Acme Corp...",
 *   lead: { firstName: "John", company: "Acme Corp", ... },
 *   campaign: { tone: "professional", cta: "reply", ... },
 *   usedSignals: ["firstName", "company"],
 * });
 * console.log(result.score); // 85
 * console.log(result.issues); // []
 * ```
 */
export async function scoreMessage(
  config: ScoreMessageConfig
): Promise<QualityScoreResult> {
  const { message, campaign } = config;

  // Perform rule-based checks first
  const ruleChecks = performRuleBasedChecks(config);

  // Get LLM quality assessment
  let llmScore = 70; // Default if LLM fails
  try {
    const prompt = buildScoringPrompt(message, campaign);
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxOutputTokens: 200,
    });

    const parsed = parseLLMResponse(text);
    llmScore = parsed.score;

    // Add LLM reasoning as an issue if score is low
    if (llmScore < 60 && parsed.reasoning) {
      ruleChecks.issues.push(`Quality concern: ${parsed.reasoning}`);
    }
  } catch (error) {
    // Log but don't fail - use default score
    console.error("LLM scoring failed, using default:", error);
    llmScore = 70;
  }

  // Calculate final score: start with LLM score, apply rule deductions
  const finalScore = Math.max(0, llmScore - ruleChecks.deductions);

  return {
    score: finalScore,
    issues: ruleChecks.issues,
    breakdown: {
      lengthPenalty: ruleChecks.lengthPenalty,
      personalizationPenalty: ruleChecks.personalizationPenalty,
      spamPenalty: ruleChecks.spamPenalty,
      ctaPenalty: ruleChecks.ctaPenalty,
      llmScore,
    },
  };
}

// Export for testing
export { performRuleBasedChecks, buildScoringPrompt, parseLLMResponse, SPAM_PHRASES };
