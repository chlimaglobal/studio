
'use client';

import { z } from 'zod';

export const AddCommissionFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  amount: z.coerce.number().positive('O valor da comissão deve ser positivo.'),
  client: z.string().optional(),
  date: z.date({ required_error: 'Por favor, selecione uma data.' }),
});

export type Commission = {
  id: string;
} & z.infer<typeof AddCommissionFormSchema>;
