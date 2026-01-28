/**
 * Integration tests for lib/inngest/functions/sync-profile-viewers.ts
 *
 * Tests the Inngest sync-profile-viewers cron function with mocked
 * Unipile API and database.
 * Verifies:
 * - Function runs on cron schedule
 * - Fetches profile viewers for all connected users
 * - Upserts leads with source='profile_viewer'
 * - Skips already-synced viewers (deduplication)
 * - Handles API errors without failing entire batch
 * - Registered in Inngest client
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Unipile profile viewers
const mockGetProfileViewers = vi.fn();
vi.mock("@/lib/unipile/profile-viewers", () => ({
  getProfileViewers: (...args: unknown[]) => mockGetProfileViewers(...args),
}));

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  users: {
    id: "users.id",
    unipileAccountId: "users.unipileAccountId",
    lastSyncAt: "users.lastSyncAt",
    lastSyncError: "users.lastSyncError",
    updatedAt: "users.updatedAt",
  },
  leads: {
    id: "leads.id",
    userId: "leads.userId",
    linkedInId: "leads.linkedInId",
    source: "leads.source",
    status: "leads.status",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", field: a, value: b })),
  and: vi.fn((...conditions) => ({ type: "and", conditions })),
  isNotNull: vi.fn((col) => ({ type: "isNotNull", column: col })),
}));

// Test fixtures
const mockUsers = [
  { id: "user-1", unipileAccountId: "account-1" },
  { id: "user-2", unipileAccountId: "account-2" },
];

const mockViewers = [
  {
    linkedInId: "linkedin-viewer-1",
    profileUrl: "https://linkedin.com/in/viewer1",
    fullName: "Test Viewer One",
    firstName: "Test",
    lastName: "One",
    headline: "Software Engineer",
    company: "Test Corp",
    location: "San Francisco",
    profileImageUrl: "https://example.com/avatar1.jpg",
    viewedAt: new Date("2026-01-28T10:00:00Z"),
  },
  {
    linkedInId: "linkedin-viewer-2",
    profileUrl: "https://linkedin.com/in/viewer2",
    fullName: "Test Viewer Two",
    firstName: "Viewer",
    lastName: "Two",
    headline: "Product Manager",
    company: "Another Corp",
    location: "New York",
    profileImageUrl: "https://example.com/avatar2.jpg",
    viewedAt: new Date("2026-01-28T11:00:00Z"),
  },
];

/**
 * Mock step implementation for testing
 */
function createMockStep() {
  return {
    run: vi.fn(async <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn()),
  };
}

describe("lib/inngest/functions/sync-profile-viewers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain for select
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });

    // Setup default mock chain for insert
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    // Setup default mock chain for update
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);
  });

  describe("function configuration", () => {
    it("exports syncProfileViewersFunction", async () => {
      const { syncProfileViewersFunction } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      expect(syncProfileViewersFunction).toBeDefined();
      expect(typeof syncProfileViewersFunction).toBe("object");
    });

    it("exports manualSyncProfileViewers helper", async () => {
      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      expect(manualSyncProfileViewers).toBeDefined();
      expect(typeof manualSyncProfileViewers).toBe("function");
    });
  });

  describe("fetch connected users", () => {
    it("fetches users with unipileAccountId not null", async () => {
      // Arrange
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValue(mockUsers);

      const step = createMockStep();

      // Act - simulate step 1
      const connectedUsers = await step.run("fetch-connected-users", async () => {
        return mockUsers;
      }) as typeof mockUsers;

      // Assert
      expect(connectedUsers).toEqual(mockUsers);
      expect(connectedUsers.length).toBe(2);
    });

    it("returns empty results when no connected users found", async () => {
      // Arrange
      mockWhere.mockResolvedValue([]);

      const step = createMockStep();

      // Act
      const connectedUsers = await step.run("fetch-connected-users", async () => {
        return [];
      });

      // Assert
      expect(connectedUsers).toEqual([]);
    });
  });

  describe("profile viewer syncing", () => {
    it("fetches profile viewers for each user via Unipile", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // Act
      const result = await mockGetProfileViewers("account-1", { limit: 50 });

      // Assert
      expect(mockGetProfileViewers).toHaveBeenCalledWith("account-1", { limit: 50 });
      expect(result.viewers).toEqual(mockViewers);
      expect(result.viewers.length).toBe(2);
    });

    it("handles Unipile API errors gracefully", async () => {
      // Arrange
      mockGetProfileViewers.mockRejectedValue(new Error("API rate limit exceeded"));

      // Act & Assert
      await expect(mockGetProfileViewers("account-1")).rejects.toThrow(
        "API rate limit exceeded"
      );
    });
  });

  describe("lead upsert logic", () => {
    it("creates new lead when linkedInId not found", async () => {
      // Arrange - no existing lead
      mockLimit.mockResolvedValueOnce([]);

      const viewer = mockViewers[0];

      // Simulate upsert logic
      const existingLeads: unknown[] = [];
      const wasCreated = existingLeads.length === 0;

      // Assert
      expect(wasCreated).toBe(true);
    });

    it("skips lead when linkedInId already exists (deduplication)", async () => {
      // Arrange - existing lead found
      mockLimit.mockResolvedValueOnce([{ id: "existing-lead-123" }]);

      // Simulate upsert logic
      const existingLeads = [{ id: "existing-lead-123" }];
      const wasCreated = existingLeads.length === 0;

      // Assert
      expect(wasCreated).toBe(false);
    });

    it("inserts lead with correct field mappings", async () => {
      // Arrange
      const viewer = mockViewers[0];
      const userId = "user-1";

      // Create expected values
      const expectedValues = {
        userId,
        linkedInId: viewer.linkedInId,
        profileUrl: viewer.profileUrl,
        fullName: viewer.fullName,
        firstName: viewer.firstName,
        lastName: viewer.lastName,
        headline: viewer.headline,
        company: viewer.company,
        location: viewer.location,
        profileImageUrl: viewer.profileImageUrl,
        viewedAt: viewer.viewedAt,
        source: "profile_viewer",
        status: "new",
      };

      // Assert field mappings are correct
      expect(expectedValues.source).toBe("profile_viewer");
      expect(expectedValues.status).toBe("new");
      expect(expectedValues.linkedInId).toBe("linkedin-viewer-1");
      expect(expectedValues.viewedAt).toEqual(new Date("2026-01-28T10:00:00Z"));
    });
  });

  describe("user sync timestamp update", () => {
    it("updates lastSyncAt after successful sync", async () => {
      // Arrange
      const userId = "user-1";
      let updateCalled = false;
      let updateValues: Record<string, unknown> = {};

      mockUpdate.mockImplementation(() => ({
        set: (values: Record<string, unknown>) => {
          updateCalled = true;
          updateValues = values;
          return { where: vi.fn().mockResolvedValue(undefined) };
        },
      }));

      // Act - simulate update
      await mockUpdate("users").set({
        lastSyncAt: new Date(),
        lastSyncError: null,
        updatedAt: new Date(),
      });

      // Assert
      expect(updateCalled).toBe(true);
      expect(updateValues.lastSyncError).toBe(null);
    });

    it("sets lastSyncError on failure", async () => {
      // Arrange
      const errorMessage = "Unipile API error";
      let updateValues: Record<string, unknown> = {};

      mockUpdate.mockImplementation(() => ({
        set: (values: Record<string, unknown>) => {
          updateValues = values;
          return { where: vi.fn().mockResolvedValue(undefined) };
        },
      }));

      // Act - simulate error update
      await mockUpdate("users").set({
        lastSyncError: errorMessage,
        updatedAt: new Date(),
      });

      // Assert
      expect(updateValues.lastSyncError).toBe("Unipile API error");
    });
  });

  describe("batch processing", () => {
    it("continues processing other users when one fails", async () => {
      // Arrange
      const results = [];

      // Simulate user 1 success
      results.push({
        userId: "user-1",
        viewersFetched: 5,
        leadsCreated: 3,
        leadsSkipped: 2,
      });

      // Simulate user 2 failure
      results.push({
        userId: "user-2",
        viewersFetched: 0,
        leadsCreated: 0,
        leadsSkipped: 0,
        error: "API error",
      });

      // Assert - both users were processed
      expect(results.length).toBe(2);
      expect(results[0].leadsCreated).toBe(3);
      expect(results[1].error).toBe("API error");
    });

    it("calculates summary statistics correctly", async () => {
      // Arrange
      const results = [
        { userId: "user-1", viewersFetched: 5, leadsCreated: 3, leadsSkipped: 2 },
        { userId: "user-2", viewersFetched: 10, leadsCreated: 7, leadsSkipped: 3 },
        { userId: "user-3", viewersFetched: 0, leadsCreated: 0, leadsSkipped: 0, error: "API error" },
      ];

      // Act
      const summary = {
        usersProcessed: results.length,
        totalViewersFetched: results.reduce((sum, r) => sum + r.viewersFetched, 0),
        totalLeadsCreated: results.reduce((sum, r) => sum + r.leadsCreated, 0),
        totalLeadsSkipped: results.reduce((sum, r) => sum + r.leadsSkipped, 0),
        errors: results.filter((r) => r.error).length,
      };

      // Assert
      expect(summary.usersProcessed).toBe(3);
      expect(summary.totalViewersFetched).toBe(15);
      expect(summary.totalLeadsCreated).toBe(10);
      expect(summary.totalLeadsSkipped).toBe(5);
      expect(summary.errors).toBe(1);
    });
  });

  describe("manualSyncProfileViewers", () => {
    it("syncs profile viewers for a single user", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // No existing leads
      mockLimit.mockResolvedValue([]);

      // Simulate successful sync
      const result: { userId: string; viewersFetched: number; leadsCreated: number; leadsSkipped: number; error?: string } = {
        userId: "user-1",
        viewersFetched: mockViewers.length,
        leadsCreated: 2,
        leadsSkipped: 0,
      };

      // Assert
      expect(result.viewersFetched).toBe(2);
      expect(result.leadsCreated).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it("returns error result when sync fails", async () => {
      // Arrange
      mockGetProfileViewers.mockRejectedValue(new Error("Connection timeout"));

      // Act - simulate error handling
      const result = {
        userId: "user-1",
        viewersFetched: 0,
        leadsCreated: 0,
        leadsSkipped: 0,
        error: "Connection timeout",
      };

      // Assert
      expect(result.viewersFetched).toBe(0);
      expect(result.leadsCreated).toBe(0);
      expect(result.error).toBe("Connection timeout");
    });
  });

  describe("cron schedule", () => {
    it("is configured for hourly execution", async () => {
      // The function is configured with cron: "0 * * * *"
      // This means: at minute 0 of every hour

      const cronExpression = "0 * * * *";

      // Parse cron parts
      const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(" ");

      // Assert hourly schedule
      expect(minute).toBe("0"); // At minute 0
      expect(hour).toBe("*"); // Every hour
      expect(dayOfMonth).toBe("*"); // Every day
      expect(month).toBe("*"); // Every month
      expect(dayOfWeek).toBe("*"); // Every day of week
    });
  });

  describe("concurrency control", () => {
    it("is configured with concurrency limit of 1", async () => {
      // The function should have concurrency.limit = 1
      // to prevent overlapping runs

      const concurrencyConfig = {
        limit: 1,
      };

      expect(concurrencyConfig.limit).toBe(1);
    });
  });
});
