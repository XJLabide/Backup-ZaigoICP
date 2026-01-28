/**
 * Unit tests for POST /api/actions/[id]/reject
 *
 * Tests reject endpoint behavior:
 * - Sets status='rejected', rejectedAt=now() for pending actions
 * - Stores rejection reason in 'error' field
 * - Returns 401 for unauthenticated requests
 * - Returns 404 for non-existent action
 * - Returns 404 for action not owned by user
 * - Returns 400 if action is not in 'pending' status
 * - Returns 400 for validation errors
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
      rejectedAt: "rejected_at",
      error: "error",
      updatedAt: "updated_at",
    },
    campaigns: {
      id: "id",
      userId: "user_id",
    },
  };
  return mockDbModule;
});

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { POST } from "@/app/api/actions/[id]/reject/route";

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);

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
 * Helper to create a mock POST request with optional body
 */
function createMockPostRequest(body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method: "POST",
  };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new Request("http://localhost:3000/api/actions/action_123/reject", init);
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

describe("POST /api/actions/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authenticated requests - Happy path", () => {
    it("rejects pending action and sets status to rejected", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "rejected",
        rejectedAt: new Date(),
        error: null,
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
      expect(data.action.status).toBe("rejected");
      expect(data.action.rejectedAt).toBeDefined();
    });

    it("stores rejection reason in error field", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const reason = "Message quality too low";
      const updatedAction = {
        ...action,
        status: "rejected",
        rejectedAt: new Date(),
        error: reason,
        updatedAt: new Date(),
      };
      setupDbUpdateSuccess(updatedAction);

      // Execute
      const request = createMockPostRequest({ reason });
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.action.status).toBe("rejected");
      expect(data.action.error).toBe(reason);
    });

    it("accepts empty body (reason is optional)", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "rejected",
        rejectedAt: new Date(),
        error: null,
        updatedAt: new Date(),
      };
      setupDbUpdateSuccess(updatedAction);

      // Execute - empty body
      const request = createMockPostRequest();
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.action.status).toBe("rejected");
      expect(data.action.error).toBeNull();
    });

    it("accepts empty object body", async () => {
      // Setup
      const userId = "user_123";
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const action = createMockAction();
      const campaign = { id: "campaign_789" };
      setupDbSelectWithCampaignCheck(action, campaign);

      const updatedAction = {
        ...action,
        status: "rejected",
        rejectedAt: new Date(),
        error: null,
        updatedAt: new Date(),
      };
      setupDbUpdateSuccess(updatedAction);

      // Execute - empty object
      const request = createMockPostRequest({});
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.action.status).toBe("rejected");
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
      expect(data.error).toBe("Action cannot be rejected");
      expect(data.details).toContain("approved");
    });

    it("returns 400 if action is already rejected", async () => {
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
      expect(data.error).toBe("Action cannot be rejected");
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
      expect(data.error).toBe("Action cannot be rejected");
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
      expect(data.error).toBe("Action cannot be rejected");
      expect(data.details).toContain("failed");
    });
  });

  describe("Validation errors", () => {
    it("returns 400 for reason exceeding max length", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);

      // Execute - reason over 500 chars
      const longReason = "x".repeat(501);
      const request = createMockPostRequest({ reason: longReason });
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.reason).toBeDefined();
    });

    it("returns 400 for invalid JSON in request body", async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse("user_123") as never);

      // Execute - invalid JSON
      const request = new Request(
        "http://localhost:3000/api/actions/action_123/reject",
        {
          method: "POST",
          body: "{ invalid json }",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: "action_123" }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON in request body");
    });
  });

  describe("Concurrency", () => {
    it("returns 409 when action status changed concurrently", async () => {
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

      // Assert - Race condition returns 409 Conflict
      expect(response.status).toBe(409);
      expect(data.error).toBe("Action cannot be rejected");
      expect(data.details).toContain("concurrently");
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
      expect(data).toEqual({ error: "Failed to reject action" });
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
      expect(data).toEqual({ error: "Failed to reject action" });
    });
  });
});
