import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

configureGenkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
