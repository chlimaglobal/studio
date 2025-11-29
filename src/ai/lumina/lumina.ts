'use server';

import { generateCoupleSuggestion } from '../flows/lumina-couple-chat';
import { generateSuggestion } from '../flows/lumina-chat';
import type { LuminaChatInput, LuminaCoupleChatInput } from '@/lib/types';
import { addChatMessage, addCoupleChatMessage } from '@/lib/storage';
import { useCoupleStore } from '@/hooks/use-couple-store';


async function single(input: LuminaChatInput) {
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

async function couple(input: LuminaCoupleChatInput) {
     const { userQuery, allTransactions, chatHistory, user, partner } = input;
    if (!user?.uid || !partner?.uid) throw new Error("Usuário ou parceiro não autenticado.");

    const coupleLink = useCoupleStore.getState().coupleLink;
    if (!coupleLink) throw new Error("Vínculo de casal não encontrado.");

    // 1. Adiciona a mensagem do usuário ao histórico compartilhado
    await addCoupleChatMessage(coupleLink.id, {
        role: 'user',
        text: userQuery,
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorPhotoUrl: '', // Adicione a URL da foto se disponível
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


export const sendMessageToLumina = {
    single,
    couple
}
