/**
 * Unit tests for POST /api/actions/[id]/approve
 *
 * Tests approve endpoint behavior:
 * - Sets status='approved', approvedAt=now() for pending actions
 * - Triggers action/approved Inngest event
 * - Returns 401 for unauthenticated requests
 * - Returns 404 for non-existent action
 * - Returns 404 for action not owned by user
 * - Returns 400 if action is not in 'pending' status
 * - Returns 500 for database errors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @clerk/nextjs/server
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
}));

// Mock @/lib/db
vi.mock("@/lib/db", () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
      update: vi.fn(),
    },
    actions: {
      id: "id",
      userId: "user_id",
      leadId: "lead_id",
      campaignId: "campaign_id",
      status: "status",
      approvedAt: "approved_at",
      updatedAt: "updated_at",
    },
    campaigns: {
      id: "id",
      userId: "user_id",
    },
  };
  return mockDbModule;
});

// Mock @/lib/inngest
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { POST } from "@/app/api/actions/[id]/approve/route";

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);
const mockInngest = vi.mocked(inngest);

/**
 * Helper to create mock auth response with all required Clerk properties
 */
function createMockAuthResponse(userId: string | null) {
  return {
    userId,
    sessionId: userId ? "session_123" : null,
    sessionClaims: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: null,
    factorVerificationAge: null,
    sessionStatus: userId ? "active" : null,
    tokenType: "api_key",
    isAuthenticated: !!userId,
    getToken: vi.fn(),
    has: vi.fn(),
    debug: vi.fn(),
    protect: vi.fn(),
    redirectToSignIn: vi.fn() as never,
    redirectToSignUp: vi.fn() as never,
  };
}

/**
 * Helper to create a mock POST request
 */
function createMockPostRequest(): Request {
  return new Request("http://localhost:3000/api/actions/action_123/approve", {
    method: "POST",
  });
}

/**
 * Helper to create mock action data
 */
function createMockAction(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "action_123",
    userId: "user_123",
    leadId: "lead_456",
    campaignId: "campaign_789",
    status: "pending",
    ...overrides,
  };
}

/**
 * Helper to set up mock db for action select success
 */
function setupDbSelectSuccess(action: Record<string, unknown> | null) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(action ? [action] : []),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to set up mock db for campaign ownership check
 */
function setupDbSelectWithCampaignCheck(
  action: Record<string, unknown> | null,
  campaign: Record<string, unknown> | null
) {
  let selectCallCount = 0;
  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // First call: action select
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(action ? [action] : []),
        }),
      } as unknown as ReturnType<typeof mockDb.select>;
    } else {
      // Second call: campaign ownership check
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(campaign ? [campaign] : []),
        }),
      } as unknown as ReturnType<typeof mockDb.select>;
    }
  });
}

/**
 * Helper to set up mock db for update success
 */
function setupDbUpdateSuccess(updatedAction: Record<string, unknown>) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedAction]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

/**
 * Helper to set up mock db for update returning empty (race condition)
 */
function setupDbUpdateEmpty() {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

/**
 * Helper to set up mock db for update failure
 */
function setupDbUpdateFailure(error: Error) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(error),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

describe("POST /api/actions/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInngest.send.mockResolvedValue({ ids: ["event_123"] });
  });

  describe("Authenticated requests - Happy path", () => {
    it("approves pending action and sets status to approved", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      };
      setupDbUpdateSuccess(updatedAction);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.action.status).toBe("approved");
      expect(data.action.approvedAt).toBeDefined();
    });

    it("triggers action/approved Inngest event", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      };
      setupDbUpdateSuccess(updatedAction);

      // Execute
      const request = createMockPostRequest();
      await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });

      // Assert
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: "action/approved",
        data: {
          actionId: updatedAction.id,
          leadId: action.leadId,
          campaignId: action.campaignId,
          userId,
        },
      });
    });
  });

  describe("Unauthenticated requests", () => {
    it("returns 401 for unauthenticated user", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe("Action not found", () => {
    it("returns 404 for non-existent action", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      setupDbSelectSuccess(null);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "nonexistent_action" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Action not found" });
    });

    it("returns 404 for action not owned by user", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction({ userId: "different_user" });
      setupDbSelectSuccess(action);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Action not found" });
    });

    it("returns 404 when campaign ownership check fails", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction();
      setupDbSelectWithCampaignCheck(action, null); // No matching campaign

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Action not found" });
    });
  });

  describe("Invalid action status", () => {
    it("returns 400 if action is already approved", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction({ status: "approved" });
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be approved");
      expect(data.details).toContain("approved");
    });

    it("returns 400 if action is rejected", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction({ status: "rejected" });
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be approved");
      expect(data.details).toContain("rejected");
    });

    it("returns 400 if action is sent", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction({ status: "sent" });
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be approved");
      expect(data.details).toContain("sent");
    });

    it("returns 400 if action is failed", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction({ status: "failed" });
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be approved");
      expect(data.details).toContain("failed");
    });
  });

  describe("Database errors", () => {
    it("returns 500 for database update errors", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);
      setupDbUpdateFailure(new Error("Database connection failed"));

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to approve action" });
    });

    it("returns 500 for database select errors", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Select failed")),
        }),
      } as unknown as ReturnType<typeof mockDb.select>);

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to approve action" });
    });
  });

  describe("Inngest event errors", () => {
    it("returns 503 and reverts action if Inngest send fails", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      // First update succeeds (approve), second update is for revert
      let updateCallCount = 0;
      mockDb.update.mockImplementation(() => {
        updateCallCount++;
        return {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(updateCallCount === 1 ? [updatedAction] : []),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.update>;
      });

      mockInngest.send.mockRejectedValue(new Error("Inngest unavailable"));

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert - Inngest error returns 503 and attempts revert
      expect(response.status).toBe(503);
      expect(data).toEqual({ error: "Failed to queue action execution, please try again" });
      expect(mockDb.update).toHaveBeenCalledTimes(2); // First approve, then revert
    });
  });

  describe("Concurrency", () => {
    it("returns 400 when action status changed concurrently", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);
      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      // Update returns empty array (action was already changed)
      setupDbUpdateEmpty();

      // Execute
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert - Race condition returns 400 (status no longer pending)
      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be approved");
      expect(data.details).toContain("concurrently");
    });
  });
});
