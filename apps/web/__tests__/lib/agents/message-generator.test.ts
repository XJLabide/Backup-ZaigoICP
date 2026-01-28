/**
 * Unit tests for lib/agents/message-generator.ts
 *
 * Tests AI message generation module:
 * - generateMessage() function with mocked AI
 * - buildPrompt() constructs correct prompts
 * - extractUsedSignals() identifies referenced lead data
 * - Handles missing lead fields gracefully
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
  generateMessage,
  buildPrompt,
  extractUsedSignals,
  LeadProfile,
  CampaignSettings,
} from "@/lib/agents/message-generator";

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
 * Helper to create a minimal mock response for generateText
 */
function createMockResponse(
  text: string,
  inputTokens: number,
  outputTokens: number
) {
  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
    },
  } as Awaited<ReturnType<typeof generateText>>;
}

describe("lib/agents/message-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMessage", () => {
    it("returns generated message with token usage", async () => {
      // Arrange
      mockGenerateText.mockResolvedValue(
        createMockResponse(
          "Hi John, I noticed your work at Acme Corp on scalable systems. Would love to connect!",
          150,
          25
        )
      );

      // Act
      const result = await generateMessage({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(result.message).toBe(
        "Hi John, I noticed your work at Acme Corp on scalable systems. Would love to connect!"
      );
      expect(result.tokenUsage).toEqual({
        inputTokens: 150,
        outputTokens: 25,
        totalTokens: 175,
      });
      expect(result.usedSignals).toContain("firstName");
      expect(result.usedSignals).toContain("company");
    });

    it("strips quotes from AI response", async () => {
      // Arrange
      mockGenerateText.mockResolvedValue(
        createMockResponse('"Hi John, great to meet you!"', 100, 10)
      );

      // Act
      const result = await generateMessage({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(result.message).toBe("Hi John, great to meet you!");
      expect(result.message.startsWith('"')).toBe(false);
      expect(result.message.endsWith('"')).toBe(false);
    });

    it("handles minimal lead profile gracefully", async () => {
      // Arrange
      mockGenerateText.mockResolvedValue(
        createMockResponse(
          "Hi Jane, I came across your profile and would love to connect!",
          80,
          15
        )
      );

      // Act
      const result = await generateMessage({
        lead: minimalLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(result.message).toBeTruthy();
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          maxOutputTokens: 500,
        })
      );
    });

    it("uses Claude Sonnet model with correct settings", async () => {
      // Arrange
      mockGenerateText.mockResolvedValue(
        createMockResponse("Test message", 100, 5)
      );

      // Act
      await generateMessage({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.anything(),
          temperature: 0.7,
          maxOutputTokens: 500,
        })
      );
    });

    it("throws error when AI generation fails", async () => {
      // Arrange
      mockGenerateText.mockRejectedValue(new Error("API rate limit exceeded"));

      // Act & Assert
      await expect(
        generateMessage({
          lead: fullLeadProfile,
          campaign: professionalCampaign,
        })
      ).rejects.toThrow("API rate limit exceeded");
    });
  });

  describe("buildPrompt", () => {
    it("includes all lead profile fields when present", () => {
      // Act
      const prompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(prompt).toContain("Name: John");
      expect(prompt).toContain("Headline: Senior Software Engineer at Acme Corp");
      expect(prompt).toContain("Company: Acme Corp");
      expect(prompt).toContain("Recent activity: Excited to share our new product launch!");
      expect(prompt).toContain("About: Building scalable systems");
    });

    it("handles missing lead fields gracefully", () => {
      // Act
      const prompt = buildPrompt({
        lead: minimalLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(prompt).toContain("Name: Jane");
      expect(prompt).not.toContain("Headline:");
      expect(prompt).not.toContain("Company:");
      expect(prompt).not.toContain("Recent activity:");
      expect(prompt).not.toContain("About:");
    });

    it("includes calendar link only for book_call CTA", () => {
      // Act
      const promptWithCal = buildPrompt({
        lead: fullLeadProfile,
        campaign: bookCallCampaign,
      });
      const promptWithoutCal = buildPrompt({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(promptWithCal).toContain("https://cal.com/user/30min");
      expect(promptWithoutCal).toContain("Do NOT include any calendar");
    });

    it("includes campaign tone in prompt", () => {
      // Act
      const professionalPrompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: { ...professionalCampaign, tone: "professional" },
      });
      const friendlyPrompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: { ...professionalCampaign, tone: "friendly" },
      });

      // Assert
      expect(professionalPrompt).toContain("Tone: professional");
      expect(friendlyPrompt).toContain("Tone: friendly");
    });

    it("includes 300 character limit rule", () => {
      // Act
      const prompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(prompt).toContain("Keep under 300 characters");
    });

    it("includes user name when provided", () => {
      // Act
      const prompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
        userName: "Sarah Johnson",
      });

      // Assert
      expect(prompt).toContain("Sarah Johnson");
    });

    it("uses default user name when not provided", () => {
      // Act
      const prompt = buildPrompt({
        lead: fullLeadProfile,
        campaign: professionalCampaign,
      });

      // Assert
      expect(prompt).toContain("the user");
    });

    it("shows fallback message when no lead info available", () => {
      // Arrange
      const emptyLead: LeadProfile = {
        firstName: null,
        headline: null,
        company: null,
        recentPost: null,
        about: null,
      };

      // Act
      const prompt = buildPrompt({
        lead: emptyLead,
        campaign: professionalCampaign,
      });

      // Assert
      expect(prompt).toContain("Limited profile information available");
    });
  });

  describe("extractUsedSignals", () => {
    it("detects firstName usage", () => {
      // Act
      const signals = extractUsedSignals(
        "Hi John, great to connect!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("firstName");
    });

    it("detects company reference", () => {
      // Act
      const signals = extractUsedSignals(
        "I see you work at Acme Corp, impressive!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("company");
    });

    it("detects headline reference", () => {
      // Act
      const signals = extractUsedSignals(
        "Your role as Software Engineer caught my attention.",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("headline");
    });

    it("detects recentPost reference", () => {
      // Act
      const signals = extractUsedSignals(
        "Congrats on your product launch!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("recentPost");
    });

    it("detects about reference", () => {
      // Act
      const signals = extractUsedSignals(
        "Love that you focus on mentoring developers!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("about");
    });

    it("returns empty array when no signals detected", () => {
      // Act
      const signals = extractUsedSignals(
        "Would love to connect!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toHaveLength(0);
    });

    it("handles null lead fields without errors", () => {
      // Act
      const signals = extractUsedSignals(
        "Hi Jane, let's connect!",
        minimalLeadProfile
      );

      // Assert
      expect(signals).toContain("firstName");
      expect(signals).not.toContain("headline");
      expect(signals).not.toContain("company");
    });

    it("detects multiple signals in one message", () => {
      // Act
      const signals = extractUsedSignals(
        "Hi John, your work at Acme Corp on scalable systems is impressive!",
        fullLeadProfile
      );

      // Assert
      expect(signals).toContain("firstName");
      expect(signals).toContain("company");
      expect(signals).toContain("about");
    });
  });
});
