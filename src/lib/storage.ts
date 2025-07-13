
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { addDays, subMonths } from 'date-fns';

// Utility to safely parse JSON from localStorage
function safeJSONParse<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error parsing localStorage key "${key}":`, error);
    return defaultValue;
  }
}

// ======== TRANSACTIONS ========

const TRANSACTIONS_KEY = 'financeflow_transactions';

export function getStoredTransactions(): Transaction[] {
  const transactions = safeJSONParse<Transaction[]>(TRANSACTIONS_KEY, []);
  // Sort by date descending
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addStoredTransaction(data: z.infer<typeof TransactionFormSchema>) {
  const transactions = getStoredTransactions();
  const newTransaction: Transaction = {
    id: `txn_${Date.now()}`,
    ...data,
    date: data.date.toISOString(), // Store date as ISO string
  };
  transactions.unshift(newTransaction);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  // Dispatch a storage event to notify other tabs/windows
  window.dispatchEvent(new Event('storage'));
}

// ======== CARDS ========

const CARDS_KEY = 'financeflow_cards';

export function getStoredCards(): Card[] {
  return safeJSONParse<Card[]>(CARDS_KEY, [
    { id: 'card_1', name: 'Nubank', brand: 'mastercard', closingDay: 20, dueDay: 27 },
    { id: 'card_2', name: 'Inter', brand: 'mastercard', closingDay: 25, dueDay: 5 },
  ]);
}

export function addStoredCard(data: z.infer<typeof AddCardFormSchema>) {
  const cards = getStoredCards();
  const newCard: Card = {
    id: `card_${Date.now()}`,
    ...data,
  };
  cards.push(newCard);
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  window.dispatchEvent(new Event('storage'));
}


// ======== GOALS ========

const GOALS_KEY = 'financeflow_goals';

const defaultGoals: Goal[] = [
    { id: 'goal_1', name: 'Viagem para o Japão', icon: 'Plane', targetAmount: 20000, currentAmount: 7500, deadline: addDays(new Date(), 180) },
    { id: 'goal_2', name: 'Carro Novo', icon: 'Car', targetAmount: 80000, currentAmount: 35000, deadline: addDays(new Date(), 365) },
    { id: 'goal_3', name: 'Reserva de Emergência', icon: 'ShieldCheck', targetAmount: 15000, currentAmount: 15000, deadline: subMonths(new Date(), 1) },
].map(g => ({...g, deadline: g.deadline.toISOString() as any as Date}));


export function getStoredGoals(): Goal[] {
    const goals = safeJSONParse<any[]>(GOALS_KEY, defaultGoals);
    return goals.map(goal => ({...goal, deadline: new Date(goal.deadline)}));
}

export function addStoredGoal(data: z.infer<typeof AddGoalFormSchema>) {
  const goals = getStoredGoals();
  const newGoal: Goal = {
    id: `goal_${Date.now()}`,
    ...data,
  };
  
  // Convert date to ISO string for storage
  const storableGoal = {
    ...newGoal,
    deadline: newGoal.deadline.toISOString(),
  };

  const storableGoals = goals.map(g => ({...g, deadline: new Date(g.deadline).toISOString()}));
  storableGoals.push(storableGoal);

  localStorage.setItem(GOALS_KEY, JSON.stringify(storableGoals));
  window.dispatchEvent(new Event('storage'));
}
