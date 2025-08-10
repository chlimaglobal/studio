import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // Using gemini-1.5-flash-latest as our "Turbo Mode" for fast, high-quality responses.
  model: 'googleai/gemini-1.5-flash-latest',
});
