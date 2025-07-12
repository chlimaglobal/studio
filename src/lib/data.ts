import type { Transaction, TransactionCategory } from '@/lib/types';

export function getCategories(): TransactionCategory[] {
  return [
    'Alimentação',
    'Compras',
    'Entretenimento',
    'Contas',
    'Transporte',
    'Salário',
    'Investimentos',
    'Outros',
  ];
}
