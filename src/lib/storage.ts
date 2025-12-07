import { db, functions } from './firebase';
import { collection, addDoc, onSnapshot, query, Timestamp, doc, deleteDoc, setDoc, getDoc, updateDoc, getDocs, orderBy, arrayUnion, DocumentReference, writeBatch, limit, startAfter, QueryDocumentSnapshot, DocumentData, where } from "firebase/firestore";
import { TransactionFormSchema } from './types';
import type { Transaction, Budget, ChatMessage, Account, AddAccountFormSchema, UserStatus, AppUser } from './types';
import type { Card, AddCardFormSchema } from './card-types';
import type { Goal, AddGoalFormSchema } from './goal-types';
import { z } from 'zod';
import { AddCommissionFormSchema, Commission, EditCommissionFormSchema } from './commission-types';
import { User } from 'firebase/auth';
import { addMonths } from 'date-fns';
import { httpsCallable } from 'firebase/functions';

// Helper function to convert a File to a Base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
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
                memberIds: [user.uid], // Add memberIds on creation
            }, { merge: true });
        }
    } catch (error) {
        console.error("Error ensuring user document exists:", error);
    }
};

export async function updateUserFinancials(userId: string, data: { manualCostOfLiving?: number; monthlyIncome?: number; payday?: number }) {
    if (!userId) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, cleanDataForFirestore(data), { merge: true });
}

export function onUserUpdate(userId: string, callback: (userData: AppUser | null) => void): () => void {
    if (!userId) {
        callback(null);
        return () => {};
    }
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as AppUser);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to user document:", error);
        callback(null);
    });
    return unsubscribe;
}


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

export function onUserStatusUpdate(userId: string, callback: (status: UserStatus) => void): () => void {
    if (!userId) {
        return () => {};
    }
    const userDocRef = doc(db, 'users', userId);

    return onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as UserStatus);
        } else {
            callback({}); // Return empty object if no status doc exists
        }
    });
}

export async function updateUserStatus(userId: string, newStatus: Partial<UserStatus>) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, newStatus, { merge: true });
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
        if ((error as any).code === 'not-found' || (error as any).code === 'invalid-argument') {
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

export async function addStoredTransaction(data: z.infer<typeof TransactionFormSchema>, userId?: string) {
    const currentUserId = userId || (data as any).ownerId;
    if (!currentUserId) throw new Error("User not authenticated");
    
    const installments = data.installments ? parseInt(data.installments, 10) : 0;

    if (data.paymentMethod === 'installments' && installments > 1) {
        const batch = writeBatch(db);
        // Correctly parse the amount before division
        const totalAmount = typeof data.amount === 'string' ? parseFloat(data.amount.replace(',', '.')) : data.amount;
        // Round to 2 decimal places to prevent floating point issues
        const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
        
        const originalDocId = doc(collection(db, 'users', currentUserId, 'transactions')).id; // Generate a base ID for grouping

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
                paymentMethod: 'installments',
                ownerId: currentUserId,
            };
            // @ts-ignore
            delete transactionData.installments; // remove the main installments field
            const newDocRef = doc(collection(db, 'users', currentUserId, 'transactions'));
            batch.set(newDocRef, cleanDataForFirestore(transactionData));
        }
        await batch.commit();

    } else {
         const transactionData = {
            ...data,
            amount: data.amount,
            date: Timestamp.fromDate(new Date(data.date)),
            dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : undefined,
            ownerId: currentUserId,
        };
        await addDoc(collection(db, 'users', currentUserId, 'transactions'), cleanDataForFirestore(transactionData));
    }

    try {
        const onTransactionCreatedCallable = httpsCallable(functions, 'onTransactionCreated');
        await onTransactionCreatedCallable({
            userId: currentUserId,
            transactionData: {
                type: data.type,
                amount: data.amount,
                description: data.description
            }
        });
    } catch(e) {
        console.warn("Could not call onTransactionCreated callable function.", e);
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

    let combinedAccounts: Record<string, Account> = {};
    let unsubOwned: () => void = () => {};
    let unsubShared: () => void = () => {};
    let sharedRefsUnsubs: (() => void)[] = [];


    const processAndCallback = () => {
        const sortedAccounts = Object.values(combinedAccounts).sort((a, b) => a.name.localeCompare(b.name));
        callback(sortedAccounts);
    };

    // Listener for owned accounts
    const ownedQuery = query(collection(db, "users", userId, "accounts"));
    unsubOwned = onSnapshot(ownedQuery, (snapshot) => {
        snapshot.docs.forEach((doc) => {
            combinedAccounts[doc.id] = { id: doc.id, ...doc.data() } as Account;
        });
        processAndCallback();
    }, (error) => console.error("Error fetching owned accounts:", error));

    // Listener for shared accounts references
    const sharedQuery = query(collection(db, "users", userId, "sharedAccounts"));
    unsubShared = onSnapshot(sharedQuery, (snapshot) => {
        // Clear previous listeners for specific shared accounts
        sharedRefsUnsubs.forEach(unsub => unsub());
        sharedRefsUnsubs = [];

        const accountRefs = snapshot.docs.map(docData => doc(db, docData.data().accountRef));
        
        if (accountRefs.length === 0) {
            processAndCallback();
            return;
        }

        accountRefs.forEach(accountRef => {
            const unsub = onSnapshot(accountRef, (doc) => {
                 if (doc && doc.exists()) {
                    combinedAccounts[doc.id] = { id: doc.id, ...doc.data() } as Account;
                } else {
                    // If a shared account is deleted, remove it from our local state
                    delete combinedAccounts[accountRef.id];
                }
                processAndCallback();
            });
            sharedRefsUnsubs.push(unsub);
        });
        
    }, (error) => console.error("Error fetching shared accounts:", error));

    return () => {
        unsubOwned();
        unsubShared();
        sharedRefsUnsubs.forEach(unsub => unsub());
    };
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

export async function updateStoredGoal(userId: string, goalId: string, data: z.infer<typeof AddGoalFormSchema>) {
    if (!userId) throw new Error("User not authenticated");
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalData = {
        ...data,
        targetAmount: Number(String(data.targetAmount).replace('.', '').replace(',', '.')),
        currentAmount: Number(String(data.currentAmount).replace('.', '').replace(',', '.')),
        deadline: Timestamp.fromDate(new Date(data.deadline)),
    };
    await updateDoc(goalRef, cleanDataForFirestore(goalData));
}

export async function deleteStoredGoal(userId: string, goalId: string) {
    if (!userId) throw new Error("User not authenticated");
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(goalRef);
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
    type: 'income' as const,
    category: 'Comissão' as const,
    paid: true,
    paymentMethod: 'one-time' as const,
    ownerId: userId,
  };
  
  try {
    const validatedData = TransactionFormSchema.parse(transactionData);
    await addStoredTransaction(validatedData, userId);
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
    // @ts-ignore
    await addCommissionAsTransaction(userId, receivedCommissionData);
  }
}

export async function updateStoredCommission(userId: string, commissionId: string, data: z.infer<typeof EditCommissionFormSchema>) {
  if (!userId) throw new Error("User not authenticated");
  const commissionRef = doc(db, 'users', userId, 'commissions', commissionId);
  const commissionData = {
    ...data,
    amount: Number(String(data.amount).replace('.', '').replace(',', '.')),
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
): () => void {
    if (!userId) return () => {};
    
    // Use orderBy to get messages in the correct chronological order
    const messagesRef = collection(db, 'users', userId, 'chat');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

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

        callback(newMessages);
    }, (error) => {
        console.error("Error fetching chat messages:", error);
    });
    
    return unsubscribe;
}

export async function addChatMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    if (!userId) throw new Error("User not authenticated");
    const chatMessage = {
        ...message,
        timestamp: Timestamp.now(),
    };
    return await addDoc(collection(db, 'users', userId, 'chat'), chatMessage);
}

export async function updateChatMessage(userId: string, messageId: string, message: Partial<ChatMessage>) {
    if (!userId) throw new Error("User not authenticated");
    const docRef = doc(db, 'users', userId, 'chat', messageId);
    await updateDoc(docRef, message);
}


export function onCoupleChatUpdate(
    coupleId: string, 
    callback: (messages: ChatMessage[]) => void,
): () => void {
    if (!coupleId) return () => {};
    
    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

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
        callback(newMessages);
    }, (error) => {
        console.error("Error fetching couple chat messages:", error);
    });
    
    return unsubscribe;
}

export async function addCoupleChatMessage(coupleId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    if (!coupleId) throw new Error("Couple ID not provided");
    const chatMessage = {
        ...message,
        timestamp: Timestamp.now(),
    };
    return await addDoc(collection(db, 'couples', coupleId, 'messages'), chatMessage);
}

export async function updateCoupleChatMessage(coupleId: string, messageId: string, message: Partial<ChatMessage>) {
    if (!coupleId) throw new Error("Couple ID not provided");
    const docRef = doc(db, 'couples', coupleId, 'messages', messageId);
    await updateDoc(docRef, message);
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


// ======== PARTNER DATA ========

export async function getPartnerData(partnerId: string): Promise<AppUser | null> {
    if (!partnerId) return null;
    const userDocRef = doc(db, 'users', partnerId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return userDoc.data() as AppUser;
        }
        return null;
    } catch (error) {
        console.error("Error fetching partner data:", error);
        return null;
    }
}

// Re-exporting getDoc and updateDoc for use in page.tsx
export { getDoc, doc, updateDoc };