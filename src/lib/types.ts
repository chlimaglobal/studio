

import { z } from "zod";

export const transactionCategories = [
  'Alimentação',
  'Assinaturas',
  'Bônus',
  'Cartão de Crédito',
  'Comissão',
  'Compras',
  'Contas',
  'Educação',
  'Entretenimento',
  'Gasolina',
  'Impostos',
  'Internet',
  'Investimentos',
  'Lazer',
  'Luz',
  'Manutenção Veicular',
  'Moradia',
  'Outros',
  'Presentes',
  'Restaurante',
  'Salário',
  'Saúde',
  'Seguros',
  'Supermercado',
  'Telefone',
  'Transporte',
  'Vestuário',
  'Viagem',
  'Água',
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export const TransactionFormSchema = z.object({
  description: z.string().min(3, {
    message: "A descrição deve ter pelo menos 3 caracteres.",
  }),
  amount: z.coerce.number({invalid_type_error: "Por favor, insira um valor válido."}).positive({ message: "O valor deve ser um número positivo." }),
  date: z.date({required_error: "Por favor, selecione uma data."}),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories, {
    errorMap: () => ({ message: "Por favor, selecione uma categoria." }),
  }),
  creditCard: z.string().optional(),
}).refine(data => {
    if (data.category === 'Cartão de Crédito' && (!data.creditCard || data.creditCard.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "O nome do cartão é obrigatório para esta categoria.",
    path: ["creditCard"],
});


export type Transaction = {
  id: string;
  date: string; // Store as ISO string for serialization
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
  creditCard?: string;
};
