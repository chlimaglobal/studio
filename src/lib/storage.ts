

import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, Timestamp, doc, deleteDoc, setDoc, writeBatch, where } from "firebase/firestore";
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { addMonths, addWeeks, addQuarters, addYears } from 'date-fns';
import { AddCommissionFormSchema, Commission } from './commission-types';

// Helper function to clean data before sending to Firestore
const cleanDataForFirestore = (data: Record<string, any>) => {
    const cleanedData: Record<string, any> = {};
    for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) { // Firestore also rejects null in some cases
            cleanedData[key] = data[key];
        }
    }
    return cleanedData;
};

// ======== TRANSACTIONS ========

export function onTransactionsUpdate(userId: string, callback: (transactions: Transaction[]) => void): () => void {
  if (!userId) {
    console.error("onTransactionsUpdate called without a userId.");
    return () => {}; // Return an empty unsubscribe function
  }
  const q = query(
    collection(db, "transactions"), 
    where("userId", "==", userId)
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
      } as Transaction);
    });
    // Sort client-side
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions:", error);
  });

  return unsubscribe;
}

export async function addStoredTransaction(userId: string, data: z.infer<typeof TransactionFormSchema>) {
    const transactionData = {
        ...data,
        userId,
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

export function onCardsUpdate(userId: string, callback: (cards: Card[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(
      collection(db, "cards"),
      where("userId", "==", userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const cards: Card[] = [];
    querySnapshot.forEach((doc) => {
        cards.push({ id: doc.id, ...doc.data() } as Card);
    });
    // Sort client-side
    cards.sort((a, b) => a.name.localeCompare(b.name));
    callback(cards);
  }, (error) => {
    console.error("Error fetching cards:", error);
  });

  return unsubscribe;
}

export async function addStoredCard(userId: string, data: z.infer<typeof AddCardFormSchema>) {
   try {
    const cardData = { ...data, userId };
    await addDoc(collection(db, "cards"), cleanDataForFirestore(cardData));
  } catch (e) {
    console.error("Error adding card: ", e);
    throw new Error('Falha ao adicionar cartão no Firestore.');
  }
}


// ======== GOALS ========

export function onGoalsUpdate(userId: string, callback: (goals: Goal[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(
      collection(db, "goals"),
      where("userId", "==", userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
       const data = doc.data();
       goals.push({
        id: doc.id,
        ...data,
        deadline: (data.deadline as Timestamp).toDate(),
       } as Goal);
    });
    // Sort client-side
    goals.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    callback(goals);
  }, (error) => {
    console.error("Error fetching goals:", error);
  });
  
  return unsubscribe;
}

export async function addStoredGoal(userId: string, data: z.infer<typeof AddGoalFormSchema>) {
  try {
    const goalData = {
        ...data,
        userId,
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

export function onCommissionsUpdate(userId: string, callback: (commissions: Commission[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(
      collection(db, "commissions"),
      where("userId", "==", userId)
  );

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
    // Sort client-side
    commissions.sort((a, b) => b.date.getTime() - a.date.getTime());
    callback(commissions);
  }, (error) => {
    console.error("Error fetching commissions:", error);
  });

  return unsubscribe;
}

export async function addStoredCommission(userId: string, data: z.infer<typeof AddCommissionFormSchema>) {
  try {
    const commissionData = {
      ...data,
      userId,
      amount: Number(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "commissions"), cleanDataForFirestore(commissionData));
  } catch (e) {
    console.error("Error adding commission: ", e);
    throw new Error('Falha ao adicionar comissão no Firestore.');
  }
}
