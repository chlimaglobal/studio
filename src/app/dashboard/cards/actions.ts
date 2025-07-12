'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const cardBrands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'other'] as const;
export type CardBrand = typeof cardBrands[number];

export const AddCardFormSchema = z.object({
  name: z.string().min(2, 'O nome do cartão deve ter pelo menos 2 caracteres.'),
  brand: z.enum(cardBrands, { required_error: 'Selecione uma bandeira.' }),
  closingDay: z.coerce.number().int().min(1).max(31, 'Dia inválido.'),
  dueDay: z.coerce.number().int().min(1).max(31, 'Dia inválido.'),
});

export type Card = {
  id: string;
} & z.infer<typeof AddCardFormSchema>;

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
