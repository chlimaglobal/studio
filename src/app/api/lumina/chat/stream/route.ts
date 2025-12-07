
import { generateChatContents } from '@/ai/flows/lumina-chat';
import { NextRequest } from 'next/server';
import { StreamingTextResponse, StreamData } from 'ai';
import { z } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant']), 
      content: z.string() 
    })).optional(),
  userQuery: z.string().optional(),
  allTransactions: z.array(z.any()).optional(),
  imageBase64: z.string().optional().nullable(),
  audioText: z.string().optional(),
  isCoupleMode: z.boolean().optional(),
  isTTSActive: z.boolean().optional(),
  user: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    photoURL: z.string().nullable(),
  }).optional(),
});

function toGoogleGenerativeAIRole(role: 'user' | 'assistant'): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
}

function convertToGoogleGenerativeAIContent(messages: any[]) {
  return messages.map(message => ({
    role: toGoogleGenerativeAIRole(message.role),
    parts: [{ text: message.content }],
  }));
}

export async function POST(request: NextRequest) {
  try {
    const rawInput = await request.json();
    const input = LuminaChatRequestSchema.parse(rawInput);

    const history = (input.messages || []).slice(0, -1);
    const currentMessage = input.messages?.[input.messages.length - 1];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const contents = await generateChatContents({ ...input, userQuery: currentMessage?.content });
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const streamingResponse = await model.generateContentStream({
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ]
    });

    const data = new StreamData();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamingResponse.stream) {
            controller.enqueue(chunk.text());
          }
        } catch (error) {
            console.error('Error in streaming response:', error);
        } finally {
            data.close();
            controller.close();
        }
      },
    });

    return new StreamingTextResponse(stream, {}, data);

  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Input inválido", details: error.errors }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: "Erro interno do servidor. Verifique os logs." }), { status: 500 });
  }
}
