/**
 * Unit tests for lib/agents/quality-scorer.ts
 *
 * Tests quality scoring module:
 * - scoreMessage() function with mocked AI
 * - performRuleBasedChecks() detects issues
 * - buildScoringPrompt() constructs correct prompts
 * - parseLLMResponse() handles various response formats
 * - Low/medium/high score cases
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK before imports
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "claude-sonnet-4-5-20250929" })),
}));

// Import after mocks
import { generateText } from "ai";
import {
  scoreMessage,
  performRuleBasedChecks,
  buildScoringPrompt,
  parseLLMResponse,
  MIN_QUALITY_SCORE,
  MAX_CONNECTION_MESSAGE_LENGTH,
  SPAM_PHRASES,
  type QualityScoreResult,
  type ScoreMessageConfig,
} from "@/lib/agents/quality-scorer";
import type { LeadProfile, CampaignSettings } from "@/lib/agents/message-generator";

const mockGenerateText = vi.mocked(generateText);

// Test fixtures
const fullLeadProfile: LeadProfile = {
  firstName: "John",
  headline: "Senior Software Engineer at Acme Corp",
  company: "Acme Corp",
  recentPost: "Excited to share our new product launch!",
  about: "Building scalable systems and mentoring junior developers",
};

const minimalLeadProfile: LeadProfile = {
  firstName: "Jane",
  headline: null,
  company: null,
  recentPost: null,
  about: null,
};

const professionalCampaign: CampaignSettings = {
  tone: "professional",
  cta: "reply",
  calendarLink: null,
};

const bookCallCampaign: CampaignSettings = {
  tone: "friendly",
  cta: "book_call",
  calendarLink: "https://cal.com/user/30min",
};

/**
 * Helper to create a mock LLM response
 */
function createMockLLMResponse(score: number, reasoning: string) {
  return {
    text: JSON.stringify({ score, reasoning }),
    usage: { inputTokens: 100, outputTokens: 20 },
  } as Awaited<ReturnType<typeof generateText>>;
}

describe("lib/agents/quality-scorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constants", () => {
    it("exports MIN_QUALITY_SCORE as 60", () => {
      expect(MIN_QUALITY_SCORE).toBe(60);
    });

    it("exports MAX_CONNECTION_MESSAGE_LENGTH as 300", () => {
      expect(MAX_CONNECTION_MESSAGE_LENGTH).toBe(300);
    });

    it("exports SPAM_PHRASES array", () => {
      expect(SPAM_PHRASES).toBeInstanceOf(Array);
      expect(SPAM_PHRASES.length).toBeGreaterThan(0);
      expect(SPAM_PHRASES).toContain("once in a lifetime");
    });
  });

  describe("scoreMessage", () => {
    describe("high score cases (passing)", () => {
      it("returns high score for well-personalized message", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(90, "Excellent personalization and professional tone")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I noticed your work on scalable systems at Acme Corp. Your product launch post was inspiring! Would love to connect.",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company", "recentPost"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBeGreaterThanOrEqual(MIN_QUALITY_SCORE);
        expect(result.issues).toHaveLength(0);
        expect(result.breakdown.llmScore).toBe(90);
      });

      it("returns score with no deductions when all checks pass", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(85, "Good message")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I came across your profile and was impressed by your work at Acme Corp. Let's connect!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBe(85);
        expect(result.breakdown.lengthPenalty).toBe(0);
        expect(result.breakdown.personalizationPenalty).toBe(0);
        expect(result.breakdown.spamPenalty).toBe(0);
        expect(result.breakdown.ctaPenalty).toBe(0);
      });
    });

    describe("medium score cases (borderline)", () => {
      it("returns medium score when missing profile details", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(80, "Generic message")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I would love to connect with you on LinkedIn. Looking forward to networking!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName"], // Only firstName, no profile details
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBe(55); // 80 - 25 (no profile detail)
        expect(result.issues).toContain("No reference to their profile details. Mention their headline, company, or recent activity.");
        expect(result.breakdown.personalizationPenalty).toBe(25);
      });

      it("returns medium score when asking for meeting with reply CTA", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(80, "Appropriate content")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I noticed your work at Acme Corp. Would you be open to a quick call to discuss?",
          lead: fullLeadProfile,
          campaign: professionalCampaign, // cta: "reply", not "book_call"
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBe(65); // 80 - 15 (meeting request)
        expect(result.issues).toContain("Asks for a meeting in the first message. Focus on connecting first, schedule later.");
        expect(result.breakdown.ctaPenalty).toBe(15);
      });
    });

    describe("low score cases (failing)", () => {
      it("returns low score for too short message", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(60, "Too brief")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, let's connect!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBeLessThan(MIN_QUALITY_SCORE);
        expect(result.issues).toContain("Message is too short (under 50 characters). Add more context to make it personal.");
        expect(result.breakdown.lengthPenalty).toBe(30);
      });

      it("returns low score for too long message", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(75, "Good content but too long")
        );

        const longMessage = "Hi John, ".padEnd(350, "x"); // Over 300 chars

        const config: ScoreMessageConfig = {
          message: longMessage,
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.issues).toContain(`Message exceeds ${MAX_CONNECTION_MESSAGE_LENGTH} character limit. LinkedIn will truncate it.`);
        expect(result.breakdown.lengthPenalty).toBe(20);
      });

      it("returns low score for spam phrases", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(70, "Contains promotional language")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I have a once in a lifetime opportunity at Acme Corp that you won't want to miss!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBe(40); // 70 - 30 (spam)
        expect(result.issues[0]).toContain("spam-like phrases");
        expect(result.breakdown.spamPenalty).toBe(30);
      });

      it("returns low score for missing first name", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(70, "Impersonal greeting")
        );

        const config: ScoreMessageConfig = {
          message: "Hello, I noticed your excellent work at Acme Corp and would love to connect!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.issues).toContain("Message doesn't include the recipient's name. Add their first name for a personal touch.");
        expect(result.breakdown.personalizationPenalty).toBe(20);
      });

      it("returns low score with multiple issues", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(65, "Multiple issues")
        );

        const config: ScoreMessageConfig = {
          message: "Hey there! This is a limited time opportunity!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: [], // No signals used
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBeLessThan(MIN_QUALITY_SCORE);
        expect(result.issues.length).toBeGreaterThanOrEqual(3); // short, no name, no detail, spam
      });
    });

    describe("edge cases", () => {
      it("handles LLM failure gracefully with default score", async () => {
        // Arrange
        mockGenerateText.mockRejectedValue(new Error("API rate limit"));

        const config: ScoreMessageConfig = {
          message: "Hi John, I noticed your work at Acme Corp. Would love to connect!",
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.score).toBe(70); // Default LLM score, no deductions
        expect(result.breakdown.llmScore).toBe(70);
      });

      it("allows meeting request for book_call CTA", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(85, "Appropriate call request")
        );

        const config: ScoreMessageConfig = {
          message: "Hi John, I noticed your work at Acme Corp. Would you be open to a quick call?",
          lead: fullLeadProfile,
          campaign: bookCallCampaign, // cta: "book_call"
          usedSignals: ["firstName", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        expect(result.breakdown.ctaPenalty).toBe(0);
        expect(result.issues).not.toContain("Asks for a meeting in the first message. Focus on connecting first, schedule later.");
      });

      it("handles lead with no firstName gracefully", async () => {
        // Arrange
        mockGenerateText.mockResolvedValue(
          createMockLLMResponse(75, "No name available")
        );

        const leadNoName: LeadProfile = {
          firstName: null,
          headline: "Software Engineer",
          company: "Tech Inc",
          recentPost: null,
          about: null,
        };

        const config: ScoreMessageConfig = {
          message: "Hello, I noticed your work as a Software Engineer at Tech Inc. Would love to connect!",
          lead: leadNoName,
          campaign: professionalCampaign,
          usedSignals: ["headline", "company"],
        };

        // Act
        const result = await scoreMessage(config);

        // Assert
        // Should not penalize for missing name if name is not available
        expect(result.issues).not.toContain("Message doesn't include the recipient's name.");
      });
    });
  });

  describe("performRuleBasedChecks", () => {
    it("detects short message", () => {
      const result = performRuleBasedChecks({
        message: "Hi!",
        lead: fullLeadProfile,
        campaign: professionalCampaign,
        usedSignals: [],
      });

      expect(result.lengthPenalty).toBe(30);
      expect(result.issues.some((i) => i.includes("too short"))).toBe(true);
    });

    it("detects long message", () => {
      const result = performRuleBasedChecks({
        message: "x".repeat(350),
        lead: fullLeadProfile,
        campaign: professionalCampaign,
        usedSignals: [],
      });

      expect(result.lengthPenalty).toBe(20);
      expect(result.issues.some((i) => i.includes("300 character limit"))).toBe(true);
    });

    it("detects all spam phrases", () => {
      // Test a few spam phrases
      const spamPhrases = ["once in a lifetime", "act now", "guaranteed"];

      for (const phrase of spamPhrases) {
        const result = performRuleBasedChecks({
          message: `Hi John, this is ${phrase} at Acme Corp with great work happening!`,
          lead: fullLeadProfile,
          campaign: professionalCampaign,
          usedSignals: ["firstName", "company"],
        });

        expect(result.spamPenalty).toBe(30);
      }
    });

    it("returns zero deductions for perfect message", () => {
      const result = performRuleBasedChecks({
        message: "Hi John, I noticed your excellent work on scalable systems at Acme Corp. Would love to connect!",
        lead: fullLeadProfile,
        campaign: professionalCampaign,
        usedSignals: ["firstName", "company", "about"],
      });

      expect(result.deductions).toBe(0);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("buildScoringPrompt", () => {
    it("includes message in prompt", () => {
      const prompt = buildScoringPrompt("Test message", professionalCampaign);

      expect(prompt).toContain("Test message");
    });

    it("includes campaign tone", () => {
      const prompt = buildScoringPrompt("Test", professionalCampaign);

      expect(prompt).toContain("Tone: professional");
    });

    it("includes campaign goal", () => {
      const prompt = buildScoringPrompt("Test", bookCallCampaign);

      expect(prompt).toContain("Goal: book_call");
    });

    it("includes scoring criteria", () => {
      const prompt = buildScoringPrompt("Test", professionalCampaign);

      expect(prompt).toContain("Authenticity");
      expect(prompt).toContain("Relevance");
      expect(prompt).toContain("Clarity");
      expect(prompt).toContain("Appropriateness");
    });

    it("requests JSON response format", () => {
      const prompt = buildScoringPrompt("Test", professionalCampaign);

      expect(prompt).toContain("JSON");
      expect(prompt).toContain('"score"');
      expect(prompt).toContain('"reasoning"');
    });
  });

  describe("parseLLMResponse", () => {
    it("parses valid JSON response", () => {
      const result = parseLLMResponse('{"score": 85, "reasoning": "Good message"}');

      expect(result.score).toBe(85);
      expect(result.reasoning).toBe("Good message");
    });

    it("extracts number from non-JSON response", () => {
      const result = parseLLMResponse("The score is 75 out of 100");

      expect(result.score).toBe(75);
    });

    it("clamps score to valid range (0-100)", () => {
      expect(parseLLMResponse('{"score": 150}').score).toBe(100);
      expect(parseLLMResponse('{"score": -10}').score).toBe(0);
    });

    it("returns default score for unparseable response", () => {
      const result = parseLLMResponse("Unable to evaluate");

      expect(result.score).toBe(70);
    });

    it("handles malformed JSON gracefully", () => {
      const result = parseLLMResponse('{"score": }');

      expect(result.score).toBe(70);
    });
  });
});
