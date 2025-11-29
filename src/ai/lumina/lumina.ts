'use server';

import { generateCoupleSuggestion } from '../flows/lumina-couple-chat';
import { generateSuggestion } from '../flows/lumina-chat';
import type { LuminaChatInput, LuminaCoupleChatInput, CoupleLink } from '@/lib/types';
import { addChatMessage, addCoupleChatMessage } from '@/lib/storage';

export async function sendMessageToLuminaSingle(input: LuminaChatInput) {
    const { userQuery, allTransactions, chatHistory, imageBase64, isTTSActive, audioText, user } = input;
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    // 1. Adiciona a mensagem do usuário ao histórico
    await addChatMessage(user.uid, {
        role: "user",
        text: userQuery,
        authorId: user.uid,
        authorName: user.displayName || 'Você',
        authorPhotoUrl: user.photoURL || '',
    });

    // 2. Chama a IA para gerar a resposta
    const luminaResponse = await generateSuggestion({
        userQuery,
        allTransactions,
        chatHistory,
        imageBase64,
        isTTSActive,
        audioText
    });
    
    // 3. Adiciona a resposta da Lúmina ao histórico
    await addChatMessage(user.uid, {
        role: "lumina",
        text: luminaResponse.text,
        authorName: "Lúmina",
        authorPhotoUrl: "/lumina-avatar.png",
        suggestions: luminaResponse.suggestions,
    });
}

export async function sendMessageToLuminaCouple(input: LuminaCoupleChatInput, coupleLink: CoupleLink | null) {
     const { userQuery, allTransactions, chatHistory, user, partner } = input;
    if (!user?.uid || !partner?.uid) throw new Error("Usuário ou parceiro não autenticado.");

    if (!coupleLink) throw new Error("Vínculo de casal não encontrado.");

    // 1. Adiciona a mensagem do usuário ao histórico compartilhado
    await addCoupleChatMessage(coupleLink.id, {
        role: 'user',
        text: userQuery,
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorPhotoUrl: user.photoURL || '',
    });

    // 2. Chama a IA para gerar a resposta
    const luminaResponse = await generateCoupleSuggestion({
        userQuery,
        allTransactions,
        chatHistory,
        user,
        partner,
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
