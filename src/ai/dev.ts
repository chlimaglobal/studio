
import { config } from 'dotenv';
config();

import '@/ai/flows/categorize-transaction.ts';
import '@/ai/flows/extract-transaction-from-text.ts';
import '@/ai/flows/generate-financial-analysis.ts';
import '@/ai/flows/extract-from-file.ts';
import '@/ai/flows/analyze-investor-profile.ts';
// Chat flow is now imported via API route
// import '@/ai/flows/lumina-chat.ts'; 
import '@/ai/flows/mediate-goals.ts';
import '@/ai/flows/extract-from-image.ts';
import '@/ai/flows/recovery-protocol-flow.ts';
