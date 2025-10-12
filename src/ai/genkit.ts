
import { genkit, ModelReference } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

// Using gemini-2.5-pro as our default model for high-quality, stable responses.
export const model = 'googleai/gemini-2.5-pro';
