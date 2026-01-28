import { EventSchemas, Inngest } from "inngest";

/**
 * Event types for the LinkedIn Automation platform
 * Following Inngest naming convention: domain/action.verb
 */

/**
 * Event payload when a lead is qualified and ready for message generation
 */
export interface LeadQualifiedEvent {
  data: {
    /** The ID of the lead being qualified */
    leadId: string;
    /** The ID of the campaign the lead is assigned to */
    campaignId: string;
    /** The ID of the user who owns this lead/campaign */
    userId: string;
  };
}

/**
 * Event payload when a message has been generated for a lead
 */
export interface MessageGeneratedEvent {
  data: {
    /** The ID of the lead the message was generated for */
    leadId: string;
    /** The ID of the campaign the message belongs to */
    campaignId: string;
    /** The ID of the user who owns this lead/campaign */
    userId: string;
    /** The ID of the action record containing the message */
    actionId: string;
    /** The quality score of the generated message (0-100) */
    qualityScore: number;
  };
}

/**
 * All event types for the application
 */
export type Events = {
  "lead/qualified": LeadQualifiedEvent;
  "message/generated": MessageGeneratedEvent;
};

/**
 * Typed Inngest client for the LinkedIn Automation platform
 *
 * Usage:
 * - Import this client in API routes to send events
 * - Import this client in Inngest functions to create typed handlers
 *
 * Event idempotency:
 * - For lead/qualified: use `${leadId}-${campaignId}` as idempotency key
 */
export const inngest = new Inngest({
  id: "linkedin-automation",
  schemas: new EventSchemas().fromRecord<Events>(),
});
