import type { Transaction, TransactionCategory } from '@/lib/types';

export function getCategories(): TransactionCategory[] {
  return [
    'Food',
    'Shopping',
    'Entertainment',
    'Utilities',
    'Transportation',
    'Salary',
    'Investments',
    'Other',
  ];
}

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    date: new Date('2024-07-15'),
    description: 'Salary Deposit',
    amount: 5000,
    type: 'income',
    category: 'Salary',
  },
  {
    id: 'txn_2',
    date: new Date('2024-07-16'),
    description: 'Grocery Shopping at Whole Foods',
    amount: 150.75,
    type: 'expense',
    category: 'Food',
  },
  {
    id: 'txn_3',
    date: new Date('2024-07-17'),
    description: 'Monthly Rent',
    amount: 1800,
    type: 'expense',
    category: 'Utilities',
  },
  {
    id: 'txn_4',
    date: new Date('2024-07-18'),
    description: 'New sneakers from Nike',
    amount: 120,
    type: 'expense',
    category: 'Shopping',
  },
  {
    id: 'txn_5',
    date: new Date('2024-07-20'),
    description: 'Movie night tickets',
    amount: 45,
    type: 'expense',
    category: 'Entertainment',
  },
  {
    id: 'txn_6',
    date: new Date('2024-07-22'),
    description: 'Gas for car',
    amount: 55.2,
    type: 'expense',
    category: 'Transportation',
  },
    {
    id: 'txn_7',
    date: new Date('2024-06-15'),
    description: 'Salary Deposit',
    amount: 5000,
    type: 'income',
    category: 'Salary',
  },
    {
    id: 'txn_8',
    date: new Date('2024-06-20'),
    description: 'Investment in VTSAX',
    amount: 1000,
    type: 'expense',
    category: 'Investments',
  },
  {
    id: 'txn_9',
    date: new Date('2024-06-25'),
    description: 'Internet Bill',
    amount: 80,
    type: 'expense',
    category: 'Utilities',
  },
];
