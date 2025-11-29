import { NextResponse } from "next/server";
import { generateSuggestionStream } from "@/ai/flows/lumina-chat";
import type { LuminaChatInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Set timeout to 60 seconds

export async function POST(req: Request) {
  try {
    const data: LuminaChatInput = await req.json();
    const genkitStream = await generateSuggestionStream(data);

    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of genkitStream) {
                controller.enqueue(chunk.text);
            }
            controller.close();
        },
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("[LUMINA_CHAT_API_ERROR]", error);
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          "Desculpe, ocorreu um erro no servidor. A equipe já foi notificada."
        );
        controller.close();
      },
    });
    return new Response(readableStream, { status: 500 });
  }
}
