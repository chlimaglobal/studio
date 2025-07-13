'use server';

import { revalidatePath } from 'next/cache';
import { AddCardFormSchema, type Card } from '@/lib/card-types';
import { z } from 'zod';

// Simulating a database in memory
const mockCards: Card[] = [
    { id: 'card_1', name: 'Nubank', brand: 'mastercard', closingDay: 20, dueDay: 27 },
    { id: 'card_2', name: 'Inter', brand: 'mastercard', closingDay: 25, dueDay: 5 },
];


export async function getCards(): Promise<Card[]> {
    return Promise.resolve(mockCards);
}

export async function addCard(data: z.infer<typeof AddCardFormSchema>) {
    try {
        const newCard: Card = {
            id: `card_${Date.now()}`,
            ...data
        };
        mockCards.push(newCard);
        revalidatePath('/dashboard/cards');
        
        return { 
            success: true, 
            message: "Cartão adicionado com sucesso!",
        };
    } catch(error) {
        console.error("Failed to add card:", error);
        return { 
            success: false, 
            message: "Falha ao adicionar cartão."
        };
    }
}
