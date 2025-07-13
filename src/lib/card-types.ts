
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
