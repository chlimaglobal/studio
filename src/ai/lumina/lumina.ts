
'use server';

import { generateCoupleSuggestion } from '../flows/lumina-couple-chat';
import { luminaChatFlow } from '../flows/lumina-chat';
import type { LuminaChatInput, LuminaCoupleChatInput, CoupleLink, ChatMessage } from '@/lib/types';
import { addChatMessage, addCoupleChatMessage } from '@/lib/storage';
import { extractFromImage } from '../flows/extract-from-image';
import { runFlow } from 'genkit/flow';

export async function sendMessageToLuminaCouple(input: LuminaCoupleChatInput, coupleLink: CoupleLink | null) {
     const { userQuery, allTransactions, chatHistory, user, partner, imageBase64 } = input;
    if (!user?.uid || !partner?.uid) throw new Error("Usuário ou parceiro não autenticado.");

    if (!coupleLink) throw new Error("Vínculo de casal não encontrado.");

    let finalQuery = userQuery;

    if (imageBase64) {
        try {
            const extractedData = await runFlow(extractFromImage, { imageDataUri: imageBase64, allTransactions });
            finalQuery = `Analise os dados deste comprovante enviado por ${user.displayName}: ${extractedData.description}, valor ${extractedData.amount}. O que desejam fazer com isso?`;
        } catch (e) {
             console.error("Image extraction failed in Lumina couple chat:", e);
            finalQuery = userQuery || "Não consegui analisar a imagem que você enviou. Podem me dizer o que precisam?";
        }
    }

    // 1. Adiciona a mensagem do usuário ao histórico compartilhado
    await addCoupleChatMessage(coupleLink.id, {
        role: 'user',
        text: finalQuery, // Use a query que pode ter sido modificada pela extração
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorPhotoUrl: user.photoURL || '',
    });

    // 2. Chama a IA para gerar a resposta
    const luminaResponse = await runFlow(generateCoupleSuggestion, {
        ...input,
        userQuery: finalQuery,
    });

    // 3. Adiciona a resposta da Lúmina ao histórico compartilhado
    await addCoupleChatMessage(coupleLink.id, {
        role: 'lumina',
        text: luminaResponse.text,
        authorName: 'Lúmina',
        authorPhotoUrl: '/lumina-avatar.png',
        suggestions: luminaResponse.suggestions,
    });
}

// Single-user chat function
export async function sendMessageToLumina(input: LuminaChatInput) {
    const { userQuery, allTransactions, chatHistory, user, imageBase64 } = input;
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    let finalQuery = userQuery;

    // Handle image extraction if present
    if (imageBase64) {
        try {
            const extractedData = await runFlow(extractFromImage, { imageDataUri: imageBase64, allTransactions });
            finalQuery = `Analise os dados deste comprovante: ${extractedData.description}, valor ${extractedData.amount}. O que deseja fazer com isso?`;
        } catch (e) {
            console.error("Image extraction failed in Lumina chat:", e);
            finalQuery = userQuery || "Não consegui analisar a imagem que você enviou. Pode me dizer o que precisa?";
        }
    }

    // 1. Add user message to their own chat history
    const userMsgForDb: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      text: finalQuery,
      authorId: user.uid,
      authorName: user.displayName || 'Você',
      authorPhotoUrl: user.photoURL || '',
    };
    await addChatMessage(user.uid, userMsgForDb);

    // 2. Call the AI to generate the response
    const luminaResponse = await runFlow(luminaChatFlow, {
      ...input,
      userQuery: finalQuery
    });

    // 3. Add Lumina's response to the user's chat history
    await addChatMessage(user.uid, {
        role: 'lumina',
        text: luminaResponse.text,
        authorName: 'Lúmina',
        authorPhotoUrl: '/lumina-avatar.png',
        suggestions: luminaResponse.suggestions,
    });
}
