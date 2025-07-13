import { z } from 'zod';
import { icons } from 'lucide-react';

export const iconNames = Object.keys(icons) as [string, ...string[]];

export const AddGoalFormSchema = z.object({
  name: z.string().min(3, 'O nome da meta deve ter pelo menos 3 caracteres.'),
  targetAmount: z.coerce.number().positive('O valor alvo deve ser positivo.'),
  currentAmount: z.coerce.number().min(0, 'O valor atual não pode ser negativo.').default(0),
  icon: z.enum(iconNames, { required_error: 'Selecione um ícone.' }),
  deadline: z.date({ required_error: 'Por favor, selecione uma data limite.' }),
});

export type Goal = {
  id: string;
} & z.infer<typeof AddGoalFormSchema>;