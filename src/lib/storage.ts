
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, Timestamp, doc, deleteDoc, setDoc, writeBatch, getDoc, updateDoc, where } from "firebase/firestore";
import type { Transaction, TransactionFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { AddCommissionFormSchema, Commission, EditCommissionFormSchema } from './commission-types';
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
    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, { 
                email: user.email,
                displayName: user.displayName,
                createdAt: Timestamp.now(),
            });
        }
    } catch (error) {
        console.error("Error ensuring user document exists:", error);
    }
};


// ======== TRANSACTIONS ========

export function onTransactionsUpdate(userId: string, callback: (transactions: Transaction[]) => void): () => void {
  if (!userId) {
    console.error("onTransactionsUpdate called without a userId.");
    return () => {};
  }
  const q = query(collection(db, "transactions"), where("userId", "==", userId));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        date: (data.date as Timestamp)?.toDate()?.toISOString(),
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
        userId: userId,
        amount: Number(data.amount),
        date: Timestamp.fromDate(new Date(data.date))
    };
    await addDoc(collection(db, 'transactions'), cleanDataForFirestore(transactionData));
}


export async function updateStoredTransaction(userId: string, transactionId: string, data: z.infer<typeof TransactionFormSchema>) {
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionData = {
        ...data,
        userId: userId,
        amount: Number(data.amount),
        date: Timestamp.fromDate(new Date(data.date))
    };
    await updateDoc(transactionRef, cleanDataForFirestore(transactionData));
}

export async function deleteStoredTransaction(userId: string, transactionId: string): Promise<void> {
    try {
        const docRef = doc(db, "transactions", transactionId);
        // Security check on client-side although rules should prevent this
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().userId === userId) {
            await deleteDoc(docRef);
        } else {
            throw new Error("User is not authorized to delete this document or document does not exist.");
        }
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw new Error('Falha ao remover transação no Firestore.');
    }
}


// ======== CARDS ========

export function onCardsUpdate(userId: string, callback: (cards: Card[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(collection(db, "cards"), where("userId", "==", userId));

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
    const cardData = { ...data, userId: userId };
    await addDoc(collection(db, "cards"), cleanDataForFirestore(cardData));
  } catch (e) {
    console.error("Error adding card: ", e);
    throw new Error('Falha ao adicionar cartão no Firestore.');
  }
}


// ======== GOALS ========

export function onGoalsUpdate(userId: string, callback: (goals: Goal[]) => void): () => void {
  if (!userId) return () => {};
  const q = query(collection(db, "goals"), where("userId", "==", userId));

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
        userId: userId,
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
  const q = query(collection(db, "commissions"), where("userId", "==", userId));

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

// Helper to add a corresponding income transaction for a received commission
async function addCommissionAsTransaction(userId: string, commission: z.infer<typeof AddCommissionFormSchema>) {
  const transactionData = {
    description: `Comissão: ${commission.description}`,
    amount: commission.amount,
    date: commission.date,
    type: 'income' as 'income',
    category: 'Comissão' as const,
    paid: true,
    userId: userId, // Ensure transaction has userId
  };
  
  // Use a simplified object for addStoredTransaction schema
  const formSchemaCompliantData = {
      description: transactionData.description,
      amount: transactionData.amount,
      date: transactionData.date,
      type: transactionData.type,
      category: transactionData.category,
      paid: transactionData.paid
  }

  try {
    await addStoredTransaction(userId, formSchemaCompliantData);
  } catch (error) {
    console.error("Failed to add commission as transaction:", error);
  }
}

export async function addStoredCommission(userId: string, data: z.infer<typeof AddCommissionFormSchema>) {
  try {
    const commissionData = {
      ...data,
      userId: userId,
      amount: Number(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "commissions"), cleanDataForFirestore(commissionData));
    
    if (data.status === 'received') {
      await addCommissionAsTransaction(userId, data);
    }
  } catch (e) {
    console.error("Error adding commission: ", e);
    throw new Error('Falha ao adicionar comissão no Firestore.');
  }
}

export async function updateStoredCommissionStatus(userId: string, commission: Commission) {
  const commissionRef = doc(db, 'commissions', commission.id);
  const newStatus = commission.status === 'received' ? 'pending' : 'received';
  
  await updateDoc(commissionRef, { status: newStatus });
  
  if (newStatus === 'received') {
    const receivedCommissionData = { ...commission, status: newStatus, date: new Date(commission.date) };
    await addCommissionAsTransaction(userId, receivedCommissionData);
  }
}

export async function updateStoredCommission(userId: string, commissionId: string, data: z.infer<typeof EditCommissionFormSchema>) {
  const commissionRef = doc(db, 'commissions', commissionId);
  const commissionData = {
    ...data,
    userId: userId,
    amount: Number(data.amount),
    date: Timestamp.fromDate(new Date(data.date)),
  };
  await updateDoc(commissionRef, cleanDataForFirestore(commissionData));
}

export async function deleteStoredCommission(userId: string, commissionId: string) {
    const commissionRef = doc(db, 'commissions', commissionId);
    // Security check on client-side although rules should prevent this
    const docSnap = await getDoc(commissionRef);
    if (docSnap.exists() && docSnap.data().userId === userId) {
        await deleteDoc(commissionRef);
    } else {
        throw new Error("User is not authorized to delete this document or document does not exist.");
    }
}
