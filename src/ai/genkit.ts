
import { genkit, ModelReference } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

// Using gemini-1.5-flash as our default model for fast, high-quality responses.
export const model = 'googleai/gemini-1.5-flash' as ModelReference<any>;
