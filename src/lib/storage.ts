

import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, Timestamp, doc, deleteDoc, setDoc, getDoc, updateDoc, getDocs, orderBy, arrayUnion, DocumentReference, writeBatch, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { Transaction, TransactionFormSchema, Budget, ChatMessage, Account, AddAccountFormSchema } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { AddCommissionFormSchema, Commission, EditCommissionFormSchema } from './commission-types';
import { User } from 'firebase/auth';
import { addMonths } from 'date-fns';

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


// ======== USER DOCUMENT & SUBSCRIPTION ========
export const initializeUser = async (user: User) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
             await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: Timestamp.now(),
                stripeSubscriptionStatus: 'inactive', // Default status
            }, { merge: true });
        }
    } catch (error) {
        console.error("Error ensuring user document exists:", error);
    }
};

export function onUserSubscriptionUpdate(userId: string, callback: (status: string) => void): () => void {
    if (!userId) {
        console.error("onUserSubscriptionUpdate called without a userId.");
        callback('inactive');
        return () => {};
    }
    const userDocRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const status = doc.data()?.stripeSubscriptionStatus || 'inactive';
            callback(status);
        } else {
            callback('inactive');
        }
    }, (error) => {
        console.error("Error fetching user subscription status:", error);
        callback('inactive');
    });

    return unsubscribe;
}

export async function saveFcmToken(userId: string, token: string) {
    if (!userId || !token) return;
    const userDocRef = doc(db, 'users', userId);
    try {
        await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(token)
        });
    } catch (error) {
        // If the document or the fcmTokens field doesn't exist, set it.
        if ((error as any).code === 'not-found') {
            await setDoc(userDocRef, { fcmTokens: [token] }, { merge: true });
        } else {
            console.error("Error saving FCM token:", error);
        }
    }
}



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
        date: (data.date as Timestamp)?.toDate()?.toISOString(),
        dueDate: (data.dueDate as Timestamp)?.toDate()?.toISOString(),
      } as Transaction);
    });
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions:", error);
  });

  return unsubscribe;
}

export async function addStoredTransaction(userId: string, data: z.infer<typeof TransactionFormSchema>) {
    if (!userId) throw new Error("User not authenticated");
    
    const installments = typeof data.installments === 'number' ? data.installments : 0;

    if (data.paymentMethod === 'installments' && installments > 1) {
        const batch = writeBatch(db);
        const installmentAmount = data.amount / installments;
        const originalDocId = doc(collection(db, 'users', userId, 'transactions')).id; // Generate a base ID for grouping

        for (let i = 0; i < installments; i++) {
            const installmentDate = addMonths(new Date(data.date), i);
            const transactionData = {
                ...data,
                amount: installmentAmount,
                date: Timestamp.fromDate(installmentDate),
                dueDate: data.dueDate ? Timestamp.fromDate(addMonths(new Date(data.dueDate), i)) : undefined,
                installmentNumber: i + 1,
                totalInstallments: installments,
                installmentGroupId: originalDocId, // Group installments together
                paymentMethod: 'installments'
            };
            // @ts-ignore
            delete transactionData.installments; // remove the main installments field
            const newDocRef = doc(collection(db, 'users', userId, 'transactions'));
            batch.set(newDocRef, cleanDataForFirestore(transactionData));
        }
        await batch.commit();

    } else {
         const transactionData = {
            ...data,
            amount: data.amount,
            date: Timestamp.fromDate(new Date(data.date)),
            dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : undefined,
        };
        await addDoc(collection(db, 'users', userId, 'transactions'), cleanDataForFirestore(transactionData));
    }
}


export async function updateStoredTransaction(userId: string, transactionId: string, data: z.infer<typeof TransactionFormSchema>) {
    if (!userId) throw new Error("User not authenticated");
    const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
    const transactionData = {
        ...data,
        amount: data.amount, // Amount is already a number from Zod transform
        date: Timestamp.fromDate(new Date(data.date)),
        dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : undefined,
    };
    await updateDoc(transactionRef, cleanDataForFirestore(transactionData));
}

export async function deleteStoredTransaction(userId: string, transactionId: string): Promise<void> {
    if (!userId) throw new Error("User not authenticated");
    const docRef = doc(db, 'users', userId, "transactions", transactionId);
    await deleteDoc(docRef);
}


// ======== ACCOUNTS ========

export function onAccountsUpdate(userId: string, callback: (accounts: Account[]) => void): () => void {
  if (!userId) return () => {};

  // Listener for owned accounts
  const ownedQuery = query(collection(db, "users", userId, "accounts"));
  const unsubscribeOwned = onSnapshot(ownedQuery, async (ownedSnapshot) => {
    let allAccounts: Account[] = [];
    ownedSnapshot.forEach((doc) => {
        allAccounts.push({ id: doc.id, ...doc.data() } as Account);
    });

    // Listener for shared accounts
    const sharedQuery = query(collection(db, "users", userId, "sharedAccounts"));
    const sharedSnapshot = await getDocs(sharedQuery);
    
    const sharedAccountPromises = sharedSnapshot.docs.map(doc => {
        const accountRef = doc.data().accountRef as DocumentReference;
        return getDoc(accountRef);
    });

    const sharedAccountDocs = await Promise.all(sharedAccountPromises);
    sharedAccountDocs.forEach(doc => {
        if(doc.exists()){
            allAccounts.push({ id: doc.id, ...doc.data() } as Account);
        }
    });

    allAccounts.sort((a, b) => a.name.localeCompare(b.name));
    callback(allAccounts);

  }, (error) => {
    console.error("Error fetching accounts:", error);
  });

  return unsubscribeOwned;
}

export async function addStoredAccount(userId: string, data: z.infer<typeof AddAccountFormSchema>) {
   if (!userId) throw new Error("User not authenticated");
   try {
    const accountData = {
        ...data,
        ownerId: userId,
        memberIds: [userId],
        isShared: false,
        currentBalance: data.initialBalance,
        createdAt: Timestamp.now(),
    };
    await addDoc(collection(db, "users", userId, "accounts"), cleanDataForFirestore(accountData));
  } catch (e) {
    console.error("Error adding account: ", e);
    throw new Error('Falha ao adicionar conta no Firestore.');
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
   if (!userId) throw new Error("User not authenticated");
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
  if (!userId) throw new Error("User not authenticated");
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

async function addCommissionAsTransaction(userId: string, commission: z.infer<typeof AddCommissionFormSchema>) {
  const transactionData = {
    description: `Comissão: ${commission.description}`,
    amount: commission.amount,
    date: commission.date,
    type: 'income' as 'income',
    category: 'Comissão' as const,
    paid: true,
  };
  
  const formSchemaCompliantData = {
      description: transactionData.description,
      amount: String(transactionData.amount),
      date: transactionData.date,
      type: transactionData.type,
      category: transactionData.category,
      paid: transactionData.paid,
      paymentMethod: 'one-time' as const
  }

  try {
    // @ts-ignore
    await addStoredTransaction(userId, formSchemaCompliantData);
  } catch (error) {
    console.error("Failed to add commission as transaction:", error);
  }
}

export async function addStoredCommission(userId: string, data: z.infer<typeof AddCommissionFormSchema>) {
  if (!userId) throw new Error("User not authenticated");
  try {
    const commissionData = {
      ...data,
      amount: Number(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
    };
    await addDoc(collection(db, "users", userId, "commissions"), cleanDataForFirestore(commissionData));
    
    if (data.status === 'received') {
      await addCommissionAsTransaction(userId, data);
    }
  } catch (e) {
    console.error("Error adding commission: ", e);
    throw new Error('Falha ao adicionar comissão no Firestore.');
  }
}

export async function updateStoredCommissionStatus(userId: string, commissionId: string, newStatus: 'received' | 'pending', commission: Commission) {
  if (!userId) throw new Error("User not authenticated");
  const commissionRef = doc(db, 'users', userId, 'commissions', commissionId);
  
  await updateDoc(commissionRef, { status: newStatus });
  
  if (newStatus === 'received') {
    const receivedCommissionData = { ...commission, status: newStatus, date: new Date(commission.date) };
    await addCommissionAsTransaction(userId, receivedCommissionData);
  }
}

export async function updateStoredCommission(userId: string, commissionId: string, data: z.infer<typeof EditCommissionFormSchema>) {
  if (!userId) throw new Error("User not authenticated");
  const commissionRef = doc(db, 'users', userId, 'commissions', commissionId);
  const commissionData = {
    ...data,
    amount: Number(data.amount),
    date: Timestamp.fromDate(new Date(data.date)),
  };
  await updateDoc(commissionRef, cleanDataForFirestore(commissionData));
}

export async function deleteStoredCommission(userId: string, commissionId: string) {
    if (!userId) throw new Error("User not authenticated");
    const commissionRef = doc(db, 'users', userId, 'commissions', commissionId);
    await deleteDoc(commissionRef);
}


// ======== BUDGETS ========

export function onBudgetsUpdate(userId: string, monthId: string, callback: (budgets: Budget | null) => void): () => void {
    if (!userId) return () => {};
    const budgetDocRef = doc(db, 'users', userId, 'budgets', monthId);

    const unsubscribe = onSnapshot(budgetDocRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as Budget);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error fetching budgets:", error);
    });

    return unsubscribe;
}

export async function saveBudgets(userId: string, monthId: string, data: Budget) {
    if (!userId) throw new Error("User not authenticated");
    const budgetDocRef = doc(db, 'users', userId, 'budgets', monthId);
    await setDoc(budgetDocRef, cleanDataForFirestore(data), { merge: true });
}

// ======== MURAL CHAT ========
export function onChatUpdate(
    userId: string, 
    callback: (messages: ChatMessage[]) => void,
    lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null
): () => void {
    if (!userId) return () => {};
    
    const messagesRef = collection(db, 'users', userId, 'chat');
    // Listen for new messages added after the last document we've seen
    const q = lastVisibleDoc 
        ? query(messagesRef, orderBy('timestamp'), startAfter(lastVisibleDoc))
        : query(messagesRef, orderBy('timestamp'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const newMessages: ChatMessage[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            newMessages.push({
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate(),
            } as ChatMessage);
        });

        if (newMessages.length > 0) {
            callback(newMessages);
        }
    }, (error) => {
        console.error("Error fetching new chat messages:", error);
    });
    
    return unsubscribe;
}

export async function addChatMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    if (!userId) throw new Error("User not authenticated");
    const chatMessage = {
        ...message,
        timestamp: Timestamp.now(),
    };
    await addDoc(collection(db, 'users', userId, 'chat'), chatMessage);
}


// ======== BACKUP ========
const collectionsToBackup = ['transactions', 'cards', 'goals', 'commissions'];

const serializeFirestoreData = (docData: any) => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return data;
}

export async function getAllUserDataForBackup(userId: string) {
    if (!userId) {
        throw new Error("User not authenticated");
    }

    const backupData: Record<string, any[]> = {};

    for (const collectionName of collectionsToBackup) {
        const collectionRef = collection(db, 'users', userId, collectionName);
        const snapshot = await getDocs(collectionRef);
        backupData[collectionName] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data()),
        }));
    }

    // Also back up budgets
    const budgetsCollectionRef = collection(db, 'users', userId, 'budgets');
    const budgetsSnapshot = await getDocs(budgetsCollectionRef);
    backupData['budgets'] = budgetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));


    return backupData;
}
