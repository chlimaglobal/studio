
'use client';

import { z } from 'zod';

const amountSchema = z.union([z.string(), z.number()])
  .transform((val, ctx) => {
    if (typeof val === 'number') return val;
    // Clean the string: remove thousand separators (.) and then replace comma (,) with a dot (.)
    const cleanedVal = val.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanedVal);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O valor deve ser um número válido.",
      });
      return z.NEVER;
    }
    return parsed;
  })
  .refine((val) => val > 0, {
    message: "O valor da comissão deve ser positivo."
  });


export const AddCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: amountSchema,
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
  status: z.enum(['received', 'pending']).default('received'),
});


export const EditCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: amountSchema,
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
});


export type Commission = {
  id: string;
  transactionId?: string;
} & z.infer<typeof AddCommissionFormSchema>;
