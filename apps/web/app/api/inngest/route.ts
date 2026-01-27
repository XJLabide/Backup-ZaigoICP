import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";

/**
 * Inngest serve API route for the LinkedIn Automation platform.
 *
 * This route handles communication between the Inngest platform and our functions.
 * The Inngest dev server and cloud service will make requests to this endpoint to:
 * - Discover registered functions (GET)
 * - Execute function invocations (POST)
 * - Handle function step completions (PUT)
 *
 * Functions array is populated as they are implemented.
 * Currently empty - will contain generate-message function after Task 11.
 *
 * @see https://www.inngest.com/docs/getting-started/nextjs-quick-start
 */

/**
 * Array of Inngest functions to register with the serve handler.
 * Functions will be added here as they are implemented:
 * - Task 11: generateMessage function (handles lead/qualified event)
 */
const functions: Parameters<typeof serve>[0]["functions"] = [
  // Functions will be added here as they are implemented
  // Example: generateMessage (from Task 11)
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
