

'use client';

import { z } from 'zod';

const brazilianCurrencySchema = z.string().transform((value, ctx) => {
    if (!value || value.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor é obrigatório.",
        });
        return z.NEVER;
    }
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanedValue);
    if (isNaN(parsed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Por favor, insira um valor numérico válido.",
        });
        return z.NEVER;
    }
    return parsed;
});


export const AddCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: brazilianCurrencySchema.refine((val) => val > 0, { message: "O valor da comissão deve ser positivo." }),
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
  status: z.enum(['received', 'pending']).default('received'),
});


export const EditCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: brazilianCurrencySchema.refine((val) => val > 0, { message: "O valor da comissão deve ser positivo." }),
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
});


export type Commission = {
  id: string;
  transactionId?: string;
} & z.infer<typeof AddCommissionFormSchema>;

    

    
