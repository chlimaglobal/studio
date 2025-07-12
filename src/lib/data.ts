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

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    date: new Date('2024-07-15'),
    description: 'Depósito de Salário',
    amount: 5000,
    type: 'income',
    category: 'Salário',
  },
  {
    id: 'txn_2',
    date: new Date('2024-07-16'),
    description: 'Compras de supermercado no Pão de Açúcar',
    amount: 150.75,
    type: 'expense',
    category: 'Alimentação',
  },
  {
    id: 'txn_3',
    date: new Date('2024-07-17'),
    description: 'Aluguel Mensal',
    amount: 1800,
    type: 'expense',
    category: 'Contas',
  },
  {
    id: 'txn_4',
    date: new Date('2024-07-18'),
    description: 'Tênis novo da Nike',
    amount: 120,
    type: 'expense',
    category: 'Compras',
  },
  {
    id: 'txn_5',
    date: new Date('2024-07-20'),
    description: 'Ingressos para o cinema',
    amount: 45,
    type: 'expense',
    category: 'Entretenimento',
  },
  {
    id: 'txn_6',
    date: new Date('2024-07-22'),
    description: 'Gasolina para o carro',
    amount: 55.2,
    type: 'expense',
    category: 'Transporte',
  },
    {
    id: 'txn_7',
    date: new Date('2024-06-15'),
    description: 'Depósito de Salário',
    amount: 5000,
    type: 'income',
    category: 'Salário',
  },
    {
    id: 'txn_8',
    date: new Date('2024-06-20'),
    description: 'Investimento em Ações',
    amount: 1000,
    type: 'expense',
    category: 'Investimentos',
  },
  {
    id: 'txn_9',
    date: new Date('2024-06-25'),
    description: 'Conta de Internet',
    amount: 80,
    type: 'expense',
    category: 'Contas',
  },
];
