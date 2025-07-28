

import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { addMonths, addWeeks, addQuarters, addYears } from 'date-fns';
import { AddCommissionFormSchema, Commission } from './commission-types';

// ======== TRANSACTIONS ========

export function onTransactionsUpdate(callback: (transactions: Transaction[]) => void): () => void {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string to match our type
        date: (data.date as Timestamp).toDate().toISOString(),
      } as Transaction);
    });
    // The filtering logic should be done on the client side, not here.
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions:", error);
  });

  return unsubscribe;
}

// Helper function to clean data before sending to Firestore
const cleanDataForFirestore = (data: Record<string, any>) => {
    const cleanedData: Record<string, any> = {};
    for (const key in data) {
        if (data[key] !== undefined) {
            cleanedData[key] = data[key];
        }
    }
    return cleanedData;
};


export async function addStoredTransaction(data: z.infer<typeof TransactionFormSchema>) {
    const transactionData = {
        ...data,
        amount: Number(data.amount),
        date: Timestamp.fromDate(new Date(data.date))
    };
    await addDoc(collection(db, 'transactions'), cleanDataForFirestore(transactionData));
}

export async function deleteStoredTransactions(ids: string[]): Promise<void> {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, "transactions", id);
            batch.delete(docRef);
        });
        await batch.commit();
    } catch (e) {
        console.error("Error deleting documents: ", e);
        throw new Error('Falha ao remover transação no Firestore.');
    }
}


// ======== CARDS ========

export function onCardsUpdate(callback: (cards: Card[]) => void): () => void {
  const q = query(collection(db, "cards"), orderBy("name"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const cards: Card[] = [];
    querySnapshot.forEach((doc) => {
        cards.push({ id: doc.id, ...doc.data() } as Card);
    });
    callback(cards);
  });

  return unsubscribe;
}


export async function addStoredCard(data: z.infer<typeof AddCardFormSchema>) {
   try {
    await addDoc(collection(db, "cards"), cleanDataForFirestore(data));
  } catch (e) {
    console.error("Error adding card: ", e);
    throw new Error('Falha ao adicionar cartão no Firestore.');
  }
}


// ======== GOALS ========

export function onGoalsUpdate(callback: (goals: Goal[]) => void): () => void {
  const q = query(collection(db, "goals"), orderBy("deadline"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
       const data = doc.data();
       goals.push({
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to JS Date object
        deadline: (data.deadline as Timestamp).toDate(),
       } as Goal);
    });
    callback(goals);
  });
  
  return unsubscribe;
}


export async function addStoredGoal(data: z.infer<typeof AddGoalFormSchema>) {
  try {
    const goalData = {
        ...data,
        targetAmount: Number(data.targetAmount),
        currentAmount: Number(data.currentAmount),
        deadline: Timestamp.fromDate(new Date(data.deadline)),
    };
    await addDoc(collection(db, "goals"), cleanDataForFirestore(goalData));
  } catch (e) {
    console.error("Error adding goal: ", e);
    throw new Error('Falha ao adicionar meta no Firestore.');
  }
}

// ======== COMMISSIONS ========

export function onCommissionsUpdate(callback: (commissions: Commission[]) => void): () => void {
  const q = query(collection(db, "commissions"), orderBy("date", "desc"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const commissions: Commission[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      commissions.push({
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate(),
      } as Commission);
    });
    callback(commissions);
  }, (error) => {
    console.error("Error fetching commissions:", error);
  });

  return unsubscribe;
}

export async function addStoredCommission(data: z.infer<typeof AddCommissionFormSchema>) {
  try {
    const commissionData = {
      ...data,
      amount: Number(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "commissions"), cleanDataForFirestore(commissionData));
  } catch (e) {
    console.error("Error adding commission: ", e);
    throw new Error('Falha ao adicionar comissão no Firestore.');
  }
}
