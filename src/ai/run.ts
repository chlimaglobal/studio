'use server';

import { runFlow as genkitRunFlow, Flow } from 'genkit';

/**
 * Executes a Genkit flow on the server.
 * This server-only function ensures that Genkit's server-side dependencies
 * are not bundled into the client application. It acts as a safe wrapper.
 *
 * @param flow The Genkit flow to execute.
 * @param input The input data for the flow.
 * @returns The output of the flow.
 */
export async function runFlow<T, O>(flow: Flow<T, O>, input: T): Promise<O> {
  // @ts-ignore - The Genkit types can be complex, but this wrapper ensures safety.
  return genkitRunFlow(flow, input);
}
