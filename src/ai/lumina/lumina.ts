
'use server';

import { generateCoupleSuggestion } from '../flows/lumina-couple-chat';
import { generateSuggestion, generateSuggestionStream } from '../flows/lumina-chat';
import type { LuminaChatInput, LuminaCoupleChatInput, CoupleLink } from '@/lib/types';
import { addChatMessage, addCoupleChatMessage } from '@/lib/storage';
import { extractFromImage } from '../flows/extract-from-image';

export function sendMessageToLuminaStream(input: LuminaChatInput) {
    return generateSuggestionStream(input);
}

export async function sendMessageToLuminaCouple(input: LuminaCoupleChatInput, coupleLink: CoupleLink | null) {
     const { userQuery, allTransactions, chatHistory, user, partner, imageBase64 } = input;
    if (!user?.uid || !partner?.uid) throw new Error("Usuário ou parceiro não autenticado.");

    if (!coupleLink) throw new Error("Vínculo de casal não encontrado.");

    let finalQuery = userQuery;

    if (imageBase64) {
        try {
            const extractedData = await extractFromImage({ imageDataUri: imageBase64, allTransactions });
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
    const luminaResponse = await generateCoupleSuggestion({
        userQuery: finalQuery,
        allTransactions,
        chatHistory,
        user,
        partner,
        imageBase64
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
