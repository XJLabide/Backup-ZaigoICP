/**
 * Inngest client and event types for the LinkedIn Automation platform
 *
 * @example
 * // Sending an event from an API route
 * import { inngest } from "@/lib/inngest";
 *
 * await inngest.send({
 *   name: "lead/qualified",
 *   data: {
 *     leadId: "lead_123",
 *     campaignId: "campaign_456",
 *     userId: "user_789",
 *   },
 * });
 *
 * @example
 * // Creating a typed Inngest function
 * import { inngest } from "@/lib/inngest";
 *
 * export const generateMessage = inngest.createFunction(
 *   { id: "generate-message" },
 *   { event: "lead/qualified" },
 *   async ({ event, step }) => {
 *     const { leadId, campaignId, userId } = event.data;
 *     // ... implementation
 *   }
 * );
 */

export { inngest } from "./client";
export type {
  Events,
  LeadQualifiedEvent,
  MessageGeneratedEvent,
} from "./client";
