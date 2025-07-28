

import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, Timestamp, doc, deleteDoc, setDoc, writeBatch, where, getDoc } from "firebase/firestore";
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { addMonths, addWeeks, addQuarters, addYears } from 'date-fns';
import { AddCommissionFormSchema, Commission } from './commission-types';
import { User } from 'firebase/auth';

// Helper function to clean data before sending to Firestore
const cleanDataForFirestore = (data: Record<string, any>) => {
    const cleanedData: Record<string, any> = {};
    for (const key in data) {
        // Firestore rejects 'undefined' but allows 'null'. Let's keep nulls.
        if (data[key] !== undefined) {
            cleanedData[key] = data[key];
        }
    }
    return cleanedData;
};


// ======== USER DOCUMENT HELPER ========
// This function is called when a user logs in to ensure their document exists.
export const initializeUser = async (user: User) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        await setDoc(userDocRef, { 
            email: user.email,
            displayName: user.displayName,
            createdAt: Timestamp.now() 
        });
    }
};


// ======== TRANSACTIONS ========

export function onTransactionsUpdate(userId: string, callback: (transactions: Transaction[]) => void): () => void {
  if (!userId) {
    console.error("onTransactionsUpdate called without a userId.");
    return () => {};
  }
  const q = query(collection(db, "users", userId, "transactions"));
  
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
    // Sort on client-side
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
        amount: Number(data.amount),
        date: Timestamp.fromDate(new Date(data.date))
    };
    await addDoc(collection(db, 'users', userId, 'transactions'), cleanDataForFirestore(transactionData));
}

export async function deleteStoredTransactions(userId: string, ids: string[]): Promise<void> {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, "users", userId, "transactions", id);
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
  const q = query(collection(db, "users", userId, "cards"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const cards: Card[] = [];
    querySnapshot.forEach((doc) => {
        cards.push({ id: doc.id, ...doc.data() } as Card);
    });
    cards.sort((a, b) => a.name.localeCompare(b.name));
    callback(cards);
  }, (error) => {
    console.error("Error fetching cards:", error);
  });

  return unsubscribe;
}

export async function addStoredCard(userId: string, data: z.infer<typeof AddCardFormSchema>) {
   try {
    await addDoc(collection(db, "users", userId, "cards"), cleanDataForFirestore(data));
  } catch (e) {
    console.error("Error adding card: ", e);
    throw new Error('Falha ao adicionar cartão no Firestore.');
  }
}


// ======== GOALS ========

export function onGoalsUpdate(userId: string, callback: (goals: Goal[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(collection(db, "users", userId, "goals"));

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
        targetAmount: Number(data.targetAmount),
        currentAmount: Number(data.currentAmount),
        deadline: Timestamp.fromDate(new Date(data.deadline)),
    };
    await addDoc(collection(db, "users", userId, "goals"), cleanDataForFirestore(goalData));
  } catch (e) {
    console.error("Error adding goal: ", e);
    throw new Error('Falha ao adicionar meta no Firestore.');
  }
}

// ======== COMMISSIONS ========

export function onCommissionsUpdate(userId: string, callback: (commissions: Commission[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(collection(db, "users", userId, "commissions"));

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
      amount: Number(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "users", userId, "commissions"), cleanDataForFirestore(commissionData));
  } catch (e) {
    console.error("Error adding commission: ", e);
    throw new Error('Falha ao adicionar comissão no Firestore.');
  }
}
