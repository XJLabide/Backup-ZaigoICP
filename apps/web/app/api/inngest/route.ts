import { serve } from "inngest/next";
import {
  inngest,
  generateMessageFunction,
  syncProfileViewersFunction,
} from "@/lib/inngest";

/**
 * Inngest serve API route for the LinkedIn Automation platform.
 *
 * This route handles communication between the Inngest platform and our functions.
 * The Inngest dev server and cloud service will make requests to this endpoint to:
 * - Discover registered functions (GET)
 * - Execute function invocations (POST)
 * - Handle function step completions (PUT)
 *
 * @see https://www.inngest.com/docs/getting-started/nextjs-quick-start
 */

/**
 * Array of Inngest functions to register with the serve handler.
 * - generateMessageFunction: Handles lead/qualified event to generate AI messages
 * - syncProfileViewersFunction: Hourly cron to sync LinkedIn profile viewers as leads
 */
const functions: Parameters<typeof serve>[0]["functions"] = [
  generateMessageFunction,
  syncProfileViewersFunction,
];

/**
 * Create the Inngest serve handler with our client and functions
 */
const handler = serve({
  client: inngest,
  functions,
});

/**
 * Export all HTTP methods required by Inngest:
 * - GET: Function discovery and introspection
 * - POST: Function invocation
 * - PUT: Step completion and state updates
 */
export { handler as GET, handler as POST, handler as PUT };
