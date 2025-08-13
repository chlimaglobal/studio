

'use client';

import { z } from 'zod';

const brazilianCurrencySchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        return undefined;
    }
    // Remove R$, spaces, and thousand separators (.)
    const cleanedValue = value.replace(/R\$\s?/, '').replace(/\./g, '').trim();
    // Replace the decimal comma (,) with a dot (.)
    const parsableValue = cleanedValue.replace(',', '.');
    
    const parsed = parseFloat(parsableValue);

    if (isNaN(parsed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser um número válido.",
        });
        return z.NEVER;
    }
    return parsed;
});


export const AddCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: brazilianCurrencySchema
    .refine((val) => val !== undefined, { message: "O valor é obrigatório." })
    .refine((val) => val! > 0, { message: "O valor da comissão deve ser positivo." }),
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
  status: z.enum(['received', 'pending']).default('received'),
});


export const EditCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: brazilianCurrencySchema
    .refine((val) => val !== undefined, { message: "O valor é obrigatório." })
    .refine((val) => val! > 0, { message: "O valor da comissão deve ser positivo." }),
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
});


export type Commission = {
  id: string;
  transactionId?: string;
} & z.infer<typeof AddCommissionFormSchema>;

    