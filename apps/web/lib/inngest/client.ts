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
 * Event payload for manual profile viewer sync trigger
 */
export interface SyncProfileViewersEvent {
  data: {
    /** The ID of the user triggering the sync */
    userId: string;
    /** The user's Unipile account ID for API calls */
    unipileAccountId: string;
  };
}

/**
 * Event payload when an action is approved and ready for execution
 */
export interface ActionApprovedEvent {
  data: {
    /** The ID of the action to execute */
    actionId: string;
    /** The ID of the lead associated with this action */
    leadId: string;
    /** The ID of the campaign associated with this action */
    campaignId: string;
    /** The ID of the user who owns this action */
    userId: string;
  };
}

/**
 * Event payload when an action has been sent successfully
 */
export interface ActionSentEvent {
  data: {
    /** The ID of the action that was sent */
    actionId: string;
    /** The ID of the lead associated with this action */
    leadId: string;
    /** The ID of the campaign associated with this action */
    campaignId: string;
    /** The ID of the user who owns this action */
    userId: string;
    /** The Unipile request ID for tracking */
    unipileRequestId: string;
  };
}

/**
 * All event types for the application
 */
export type Events = {
  "lead/qualified": LeadQualifiedEvent;
  "message/generated": MessageGeneratedEvent;
  "sync/profile-viewers.trigger": SyncProfileViewersEvent;
  "action/approved": ActionApprovedEvent;
  "action/sent": ActionSentEvent;
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
