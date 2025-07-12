import { z } from "zod";

export const transactionCategories = [
  'Food',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Transportation',
  'Salary',
  'Investments',
  'Other',
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export const TransactionFormSchema = z.object({
  description: z.string().min(3, {
    message: "Description must be at least 3 characters.",
  }),
  amount: z.coerce.number({invalid_type_error: "Please enter a valid amount."}).positive({ message: "Amount must be a positive number." }),
  date: z.date(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories, {
    errorMap: () => ({ message: "Please select a category." }),
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
