

'use client';

import { z } from 'zod';

const positiveNumberTransformer = z.any().transform((val, ctx) => {
    if (val === undefined || val === null || val === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor é obrigatório.",
        });
        return z.NEVER;
    }
    const parsed = parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser um número válido.",
        });
        return z.NEVER;
    }
    if (parsed <= 0) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser maior que zero.",
        });
        return z.NEVER;
    }
    return parsed;
});

export const AddCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: positiveNumberTransformer,
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
  status: z.enum(['received', 'pending']).default('received'),
});


export const EditCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: positiveNumberTransformer,
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
});


export type Commission = {
  id: string;
  transactionId?: string;
} & z.infer<typeof AddCommissionFormSchema>;

    
