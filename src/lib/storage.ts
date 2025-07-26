
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, setDoc } from "firebase/firestore";
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';

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
    callback(transactions);
  });

  return unsubscribe;
}


export async function addStoredTransaction(data: z.infer<typeof TransactionFormSchema>): Promise<void> {
  try {
    const docData = {
      ...data,
      amount: Number(data.amount),
      // Convert JS Date to Firestore Timestamp
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "transactions"), docData);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error('Falha ao adicionar transação no Firestore.');
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
    await addDoc(collection(db, "cards"), data);
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
    await addDoc(collection(db, "goals"), goalData);
  } catch (e) {
    console.error("Error adding goal: ", e);
    throw new Error('Falha ao adicionar meta no Firestore.');
  }
}
