import { z } from "zod";

export const transactionCategories = [
  'Alimentação',
  'Compras',
  'Entretenimento',
  'Contas',
  'Transporte',
  'Salário',
  'Investimentos',
  'Outros',
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export const TransactionFormSchema = z.object({
  description: z.string().min(3, {
    message: "A descrição deve ter pelo menos 3 caracteres.",
  }),
  amount: z.coerce.number({invalid_type_error: "Por favor, insira um valor válido."}).positive({ message: "O valor deve ser um número positivo." }),
  date: z.date(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories, {
    errorMap: () => ({ message: "Por favor, selecione uma categoria." }),
  }),
});

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
};
