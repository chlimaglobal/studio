
import { z } from 'zod';
import { icons } from 'lucide-react';

export const iconNames = Object.keys(icons) as [string, ...string[]];

const positiveNumberOrUndefined = (ctx: z.RefinementCtx, value: any) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseFloat(String(value).replace('.', '').replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser um número positivo."
        });
        return z.NEVER;
    }
    return parsed;
};

export const AddGoalFormSchema = z.object({
  name: z.string().min(3, 'O nome da meta deve ter pelo menos 3 caracteres.'),
  targetAmount: z.any().transform((v, ctx) => positiveNumberOrUndefined(ctx, v)),
  currentAmount: z.any().transform((v, ctx) => positiveNumberOrUndefined(ctx, v)).default(0),
  icon: z.enum(iconNames, { required_error: 'Selecione um ícone.' }),
  deadline: z.date({ required_error: 'Por favor, selecione uma data limite.' }),
});

export const EditGoalFormSchema = AddGoalFormSchema;


export type Goal = {
  id: string;
} & z.infer<typeof AddGoalFormSchema>;
