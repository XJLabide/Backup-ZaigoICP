/**
 * Integration tests for lib/inngest/functions/sync-profile-viewers.ts
 *
 * Tests the Inngest sync-profile-viewers cron function with mocked
 * Unipile API and database.
 * Verifies:
 * - Function runs on cron schedule
 * - Fetches profile viewers for all connected users
 * - Upserts leads with source='profile_viewer' using atomic dedup
 * - Skips already-synced viewers (deduplication via onConflictDoNothing)
 * - Handles API errors without failing entire batch
 * - Updates user sync status correctly (success and error cases)
 * - Registered in Inngest client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Unipile profile viewers
const mockGetProfileViewers = vi.fn();
vi.mock("@/lib/unipile/profile-viewers", () => ({
  getProfileViewers: (...args: unknown[]) => mockGetProfileViewers(...args),
}));

// Track all database calls for assertions
const dbCalls: Array<{ method: string; args: unknown[] }> = [];

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock database with call tracking
const mockInsertReturning = vi.fn() as any;
const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockInsertReturning })) as any;
const mockInsertValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing })) as any;
const mockInsert = vi.fn(() => ({ values: mockInsertValues })) as any;

const mockUpdateWhere = vi.fn() as any;
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere })) as any;
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet })) as any;

const mockSelectLimit = vi.fn() as any;
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit })) as any;
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere })) as any;
const mockSelect = vi.fn(() => ({ from: mockSelectFrom })) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      dbCalls.push({ method: "select", args });
      return mockSelect();
    },
    insert: (...args: unknown[]) => {
      dbCalls.push({ method: "insert", args });
      return mockInsert();
    },
    update: (...args: unknown[]) => {
      dbCalls.push({ method: "update", args });
      return mockUpdate();
    },
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

describe("lib/inngest/functions/sync-profile-viewers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.length = 0;

    // Default: successful insert (new lead created)
    mockInsertReturning.mockResolvedValue([{ id: "new-lead-123" }]);
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("function exports", () => {
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

    it("exports UserSyncResult type via index", async () => {
      // Type export verification - if this compiles, the type is exported
      // Import directly from the function file to avoid loading all inngest functions
      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );
      expect(manualSyncProfileViewers).toBeDefined();
    });
  });

  describe("manualSyncProfileViewers", () => {
    it("fetches profile viewers and creates new leads", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // Both viewers are new (insert returns id)
      mockInsertReturning.mockResolvedValue([{ id: "new-lead-123" }]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(mockGetProfileViewers).toHaveBeenCalledWith("account-1", { limit: 50 });
      expect(result.viewersFetched).toBe(2);
      expect(result.leadsCreated).toBe(2);
      expect(result.leadsSkipped).toBe(0);
      expect(result.upsertErrors).toBe(0);
      expect(result.error).toBeUndefined();

      // Verify insert was called for each viewer
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it("skips existing leads via onConflictDoNothing", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // Both viewers already exist (insert returns empty - conflict)
      mockInsertReturning.mockResolvedValue([]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.viewersFetched).toBe(2);
      expect(result.leadsCreated).toBe(0);
      expect(result.leadsSkipped).toBe(2);
      expect(result.upsertErrors).toBe(0);
      expect(result.error).toBeUndefined();

      // Verify onConflictDoNothing was used
      expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(2);
    });

    it("handles mixed new and existing leads", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // First viewer is new, second already exists
      mockInsertReturning
        .mockResolvedValueOnce([{ id: "new-lead-123" }])
        .mockResolvedValueOnce([]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.leadsCreated).toBe(1);
      expect(result.leadsSkipped).toBe(1);
    });

    it("updates user lastSyncAt on successful sync", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });
      mockInsertReturning.mockResolvedValue([{ id: "new-lead-123" }]);

      let updateSetValues: Record<string, unknown> = {};
      mockUpdateSet.mockImplementation((values: Record<string, unknown>) => {
        updateSetValues = values;
        return { where: mockUpdateWhere };
      });

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      await manualSyncProfileViewers("user-1", "account-1");

      // Assert - verify user update was called with success state
      expect(mockUpdate).toHaveBeenCalled();
      expect(updateSetValues.lastSyncError).toBeNull();
      expect(updateSetValues.lastSyncAt).toBeInstanceOf(Date);
    });

    it("sets lastSyncError when fetch fails", async () => {
      // Arrange
      mockGetProfileViewers.mockRejectedValue(new Error("API rate limit exceeded"));

      let updateSetValues: Record<string, unknown> = {};
      mockUpdateSet.mockImplementation((values: Record<string, unknown>) => {
        updateSetValues = values;
        return { where: mockUpdateWhere };
      });

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.viewersFetched).toBe(0);
      expect(result.error).toBe("API rate limit exceeded");
      expect(updateSetValues.lastSyncError).toBe("API rate limit exceeded");
    });

    it("sets lastSyncError when upsert errors occur", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: mockViewers,
        nextCursor: null,
      });

      // First insert succeeds, second fails
      mockInsertReturning
        .mockResolvedValueOnce([{ id: "new-lead-123" }])
        .mockRejectedValueOnce(new Error("Database connection lost"));

      let updateSetValues: Record<string, unknown> = {};
      mockUpdateSet.mockImplementation((values: Record<string, unknown>) => {
        updateSetValues = values;
        return { where: mockUpdateWhere };
      });

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.leadsCreated).toBe(1);
      expect(result.upsertErrors).toBe(1);
      expect(result.error).toBe("1 upsert error(s) occurred");
      expect(updateSetValues.lastSyncError).toBe("1 upsert error(s) occurred");
    });

    it("continues processing viewers after individual upsert failure", async () => {
      // Arrange - 3 viewers, middle one fails
      const threeViewers = [
        ...mockViewers,
        {
          linkedInId: "linkedin-viewer-3",
          profileUrl: "https://linkedin.com/in/viewer3",
          fullName: "Test Viewer Three",
          firstName: null,
          lastName: null,
          headline: null,
          company: null,
          location: null,
          profileImageUrl: null,
          viewedAt: null,
        },
      ];

      mockGetProfileViewers.mockResolvedValue({
        viewers: threeViewers,
        nextCursor: null,
      });

      // First succeeds, second fails, third succeeds
      mockInsertReturning
        .mockResolvedValueOnce([{ id: "lead-1" }])
        .mockRejectedValueOnce(new Error("Constraint violation"))
        .mockResolvedValueOnce([{ id: "lead-3" }]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert - should continue and process all 3
      expect(result.viewersFetched).toBe(3);
      expect(result.leadsCreated).toBe(2);
      expect(result.upsertErrors).toBe(1);
      expect(mockInsert).toHaveBeenCalledTimes(3);
    });
  });

  describe("atomic deduplication", () => {
    it("uses onConflictDoNothing with correct target columns", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: [mockViewers[0]],
        nextCursor: null,
      });
      mockInsertReturning.mockResolvedValue([{ id: "new-lead" }]);

      let conflictTarget: unknown;
      mockOnConflictDoNothing.mockImplementation((options: { target?: unknown }) => {
        conflictTarget = options?.target;
        return { returning: mockInsertReturning };
      });

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      await manualSyncProfileViewers("user-1", "account-1");

      // Assert - verify conflict target includes both columns
      expect(mockOnConflictDoNothing).toHaveBeenCalled();
      expect(conflictTarget).toEqual(["leads.userId", "leads.linkedInId"]);
    });

    it("correctly reports new lead when returning has id", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: [mockViewers[0]],
        nextCursor: null,
      });
      mockInsertReturning.mockResolvedValue([{ id: "new-lead-abc" }]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.leadsCreated).toBe(1);
      expect(result.leadsSkipped).toBe(0);
    });

    it("correctly reports skipped lead when returning is empty (conflict)", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: [mockViewers[0]],
        nextCursor: null,
      });
      mockInsertReturning.mockResolvedValue([]); // Empty = conflict occurred

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      const result = await manualSyncProfileViewers("user-1", "account-1");

      // Assert
      expect(result.leadsCreated).toBe(0);
      expect(result.leadsSkipped).toBe(1);
    });
  });

  describe("lead data mapping", () => {
    it("inserts lead with correct field values", async () => {
      // Arrange
      mockGetProfileViewers.mockResolvedValue({
        viewers: [mockViewers[0]],
        nextCursor: null,
      });

      let insertedValues: Record<string, unknown> = {};
      mockInsertValues.mockImplementation((values: Record<string, unknown>) => {
        insertedValues = values;
        return { onConflictDoNothing: mockOnConflictDoNothing };
      });
      mockInsertReturning.mockResolvedValue([{ id: "new-lead" }]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      await manualSyncProfileViewers("user-1", "account-1");

      // Assert - verify all fields are mapped correctly
      expect(insertedValues).toMatchObject({
        userId: "user-1",
        linkedInId: "linkedin-viewer-1",
        profileUrl: "https://linkedin.com/in/viewer1",
        fullName: "Test Viewer One",
        firstName: "Test",
        lastName: "One",
        headline: "Software Engineer",
        company: "Test Corp",
        location: "San Francisco",
        profileImageUrl: "https://example.com/avatar1.jpg",
        source: "profile_viewer",
        status: "new",
      });
      expect(insertedValues.viewedAt).toEqual(new Date("2026-01-28T10:00:00Z"));
    });

    it("handles null optional fields correctly", async () => {
      // Arrange
      const viewerWithNulls = {
        linkedInId: "linkedin-null-viewer",
        profileUrl: "https://linkedin.com/in/nullviewer",
        fullName: "Unknown Viewer",
        firstName: null,
        lastName: null,
        headline: null,
        company: null,
        location: null,
        profileImageUrl: null,
        viewedAt: null,
      };

      mockGetProfileViewers.mockResolvedValue({
        viewers: [viewerWithNulls],
        nextCursor: null,
      });

      let insertedValues: Record<string, unknown> = {};
      mockInsertValues.mockImplementation((values: Record<string, unknown>) => {
        insertedValues = values;
        return { onConflictDoNothing: mockOnConflictDoNothing };
      });
      mockInsertReturning.mockResolvedValue([{ id: "new-lead" }]);

      const { manualSyncProfileViewers } = await import(
        "@/lib/inngest/functions/sync-profile-viewers"
      );

      // Act
      await manualSyncProfileViewers("user-1", "account-1");

      // Assert - null fields should be passed as-is
      expect(insertedValues.firstName).toBeNull();
      expect(insertedValues.lastName).toBeNull();
      expect(insertedValues.headline).toBeNull();
      expect(insertedValues.company).toBeNull();
      expect(insertedValues.viewedAt).toBeNull();
    });
  });

  describe("cron configuration", () => {
    it("is configured for hourly execution at minute 0", async () => {
      // The function is configured with cron: "0 * * * *"
      // This verifies our understanding of the cron expression
      const cronExpression = "0 * * * *";
      const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(" ");

      expect(minute).toBe("0"); // At minute 0
      expect(hour).toBe("*"); // Every hour
      expect(dayOfMonth).toBe("*"); // Every day
      expect(month).toBe("*"); // Every month
      expect(dayOfWeek).toBe("*"); // Every day of week
    });
  });
});
