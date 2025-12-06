
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {format, startOfMonth, endOfMonth, subDays} from "date-fns";
import { DocumentData } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * Função callable para enviar convite de parceiro
 */
export const sendPartnerInvite = functions.https.onCall(
  async (data, context) => {
    const { email, name, inviterUid, inviterName } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "O usuário precisa estar autenticado para enviar convites."
      );
    }

    if (!email || !inviterUid || !inviterName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Parâmetros inválidos ao enviar convite."
      );
    }

    // Gerar token do convite
    const inviteToken = db.collection("invites").doc().id;

    const inviteData = {
      inviterUid,
      sentByName: inviterName,
      dependentEmail: email,
      dependentName: name || "",
      status: "pending",
      createdAt: new Date()
    };

    await db.collection("invites").doc(inviteToken).set(inviteData);

    return {
      success: true,
      inviteToken,
      message: "Convite criado com sucesso!"
    };
  }
);


/**
 * Função callable para desvincular um parceiro.
 */
export const disconnectPartner = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado para realizar esta ação."
      );
    }

    const userId = context.auth.uid;

    try {
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      const userData = userDoc.data();

      if (!userData || !userData.coupleId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Você não está vinculado a um parceiro."
        );
      }

      const coupleId = userData.coupleId;
      const coupleDocRef = db.collection("couples").doc(coupleId);
      const coupleDoc = await coupleDocRef.get();
      
      if (!coupleDoc.exists) {
         // Se o couple doc não existe, apenas limpa os dados do usuário
         await userDocRef.update({
            coupleId: admin.firestore.FieldValue.delete(),
            memberIds: [userId]
         });
         return { success: true, message: "Vínculo inconsistente removido." };
      }
      
      const coupleData = coupleDoc.data() as DocumentData;
      const members = coupleData?.members || [];
      const partnerId = members.find((id: string) => id !== userId);

      const batch = db.batch();

      // Atualiza o documento do usuário atual
      batch.update(userDocRef, {
        coupleId: admin.firestore.FieldValue.delete(),
        memberIds: [userId]
      });

      // Atualiza o documento do parceiro, se existir
      if (partnerId) {
        const partnerDocRef = db.collection("users").doc(partnerId);
        batch.update(partnerDocRef, {
            coupleId: admin.firestore.FieldValue.delete(),
            memberIds: [partnerId]
        });
      }

      // Exclui o documento do casal
      batch.delete(coupleDocRef);

      await batch.commit();

      return { success: true, message: "Desvinculação concluída com sucesso." };

    } catch (error) {
      console.error("Erro ao desvincular parceiro:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Ocorreu um erro inesperado ao tentar desvincular o parceiro."
      );
    }
  }
);


export const checkDashboardStatus = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", "O usuário precisa estar autenticado."
      );
    }
    
    console.log(`Rotina de verificação diária para o usuário: ${context.auth.uid}`);
    
    return { success: true, message: "Verificação concluída." };
  }
);

/**
 * Triggered when a new transaction is created.
 * Checks ONLY for the most critical financial health rule: expenses exceeding income.
 * Other checks are moved to a scheduled function to save costs.
 */
export const onTransactionCreated = functions.firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const newTransaction = snap.data();

    const userDocRef = db.doc(`users/${userId}`);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    if (userData?.isDependent) {
      return null;
    }

    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const lastAlertedMonth = userData?.mesAlertadoRenda;

    // --- 🟥 ALERTA CRÍTICO: GASTOS > RECEITAS ---
    // This is the only check that runs on every transaction for immediate feedback.
    if (newTransaction.type === 'expense' && lastAlertedMonth !== currentMonthKey) {
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const transactionsRef = db.collection(`users/${userId}/transactions`);
        const query = transactionsRef
            .where("date", ">=", monthStart)
            .where("date", "<=", monthEnd);

        const snapshot = await query.get();
        
        let totalIncome = 0;
        let totalExpenses = 0;

        snapshot.forEach((doc) => {
            const transaction = doc.data();
            if (transaction.category && !["Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação", "Retirada", "Proventos", "Juros", "Rendimentos"].includes(transaction.category)) {
                if (transaction.type === "income") {
                    totalIncome += transaction.amount;
                } else {
                    totalExpenses += transaction.amount;
                }
            }
        });

        if (totalExpenses > totalIncome) {
            try {
                const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas.
Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;

                await db.collection(`users/${userId}/chat`).add({
                    role: "alerta",
                    text: messageText,
                    authorName: "Lúmina",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"],
                });

                await userDocRef.update({ mesAlertadoRenda: currentMonthKey });

            } catch (error) {
                console.error("Erro ao enviar alerta de balanço negativo:", error);
            }
        }
    }
    
    return null;
  });


/**
 * Scheduled function to run daily checks for all users.
 * This is the cost-effective way to run complex analyses.
 */
export const dailyFinancialCheckup = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        if (userData.isDependent) {
            continue; // Skip checks for dependent accounts
        }

        console.log(`Running daily checkup for user ${userId}`);
        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");

        // --- CHECAGENS DIÁRIAS ---

        // --- 🟧 ALERTA DE RISCO — gasto fora do padrão ---
        // Checks the last day's transactions for unusual spikes.
        const yesterday = startOfDay(subDays(now, 1));
        const today = endOfDay(subDays(now, 1));

        const recentTransactions = await db.collection(`users/${userId}/transactions`)
            .where('type', '==', 'expense')
            .where('date', '>=', yesterday)
            .where('date', '<=', today)
            .get();

        for (const transactionDoc of recentTransactions.docs) {
            const transaction = transactionDoc.data();
            const outOfPatternAlertKey = `alert_outOfPattern_${currentMonthKey}_${transaction.category}`;

            if (transaction.amount > 500 && !userData?.[outOfPatternAlertKey]) {
                const categoryTransactionsQuery = db.collection(`users/${userId}/transactions`)
                    .where('category', '==', transaction.category)
                    .where('type', '==', 'expense');

                const categorySnapshot = await categoryTransactionsQuery.get();
                if (categorySnapshot.size > 5) {
                    let total = 0;
                    categorySnapshot.forEach(doc => total += doc.data().amount);
                    const average = total / categorySnapshot.size;

                    if (transaction.amount > average * 3) {
                        await userDoc.ref.update({ [outOfPatternAlertKey]: true });
                        const messageText = `🚨 Detectei uma despesa fora do padrão em ${transaction.category}. Quer que eu investigue isso pra você?`;
                        await db.collection(`users/${userId}/chat`).add({
                            role: "alerta", text: messageText, authorName: "Lúmina",
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            suggestions: ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"],
                        });
                    }
                }
            }
        }
        
        // --- 🟨 ALERTA DE RECORRÊNCIA INCOMUM ---
        // Verifica as categorias com mais de 3 transações na última semana
        const oneWeekAgo = subDays(now, 7);
        const weeklyExpensesQuery = db.collection(`users/${userId}/transactions`)
            .where('type', '==', 'expense')
            .where('date', '>=', oneWeekAgo);
        
        const weeklyExpensesSnapshot = await weeklyExpensesQuery.get();
        const categoryCounts: { [key: string]: number } = {};
        weeklyExpensesSnapshot.forEach(doc => {
            const category = doc.data().category;
            if (category) {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
        });

        for (const category in categoryCounts) {
            if (categoryCounts[category] > 3) {
                 const unusualRecurrenceAlertKey = `alert_unusualRecurrence_${currentMonthKey}_${category}`;
                 if (!userData?.[unusualRecurrenceAlertKey]) {
                    await userDoc.ref.update({ [unusualRecurrenceAlertKey]: true });
                    const messageText = `📌 Você fez ${categoryCounts[category]} despesas recentes em ${category}. Esse comportamento está acima da sua média.`;
                    await db.collection(`users/${userId}/chat`).add({
                        role: "alerta", text: messageText, authorName: "Lúmina",
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        suggestions: ["Ver transações", "Definir orçamento", "Entendido"],
                    });
                 }
            }
        }

        // --- ⚠️ ALERTA DE LIMITE MENSAL (80% e 100%) ---
        const budgetsDocRef = db.doc(`users/${userId}/budgets/${currentMonthKey}`);
        const budgetsDoc = await budgetsDocRef.get();
        if (budgetsDoc.exists) {
            const budgetsData = budgetsDoc.data()!;
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);

            for (const category in budgetsData) {
                const categoryBudget = budgetsData[category];
                if (categoryBudget > 0) {
                    const categorySpendingQuery = db.collection(`users/${userId}/transactions`)
                        .where('category', '==', category)
                        .where('type', '==', 'expense')
                        .where('date', '>=', monthStart)
                        .where('date', '<=', monthEnd);
                        
                    const categorySpendingSnapshot = await categorySpendingQuery.get();
                    let totalCategorySpending = 0;
                    categorySpendingSnapshot.forEach(doc => totalCategorySpending += doc.data().amount);
                    
                    const spendingPercentage = (totalCategorySpending / categoryBudget) * 100;
                    
                    const alertKey100 = `alert_100_${currentMonthKey}_${category}`;
                    if (spendingPercentage >= 100 && !userData?.[alertKey100]) {
                        await userDoc.ref.update({ [alertKey100]: true });
                        const messageText = `🟥 Meta de gastos para ${category} ultrapassada. Preciso ajustar o plano.`;
                        await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"] });
                    } else {
                        const alertKey80 = `alert_80_${currentMonthKey}_${category}`;
                        if (spendingPercentage >= 80 && !userData?.[alertKey80]) {
                            await userDoc.ref.update({ [alertKey80]: true });
                            const messageText = `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${category}. Sugiro revisar suas próximas despesas.`;
                            await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["O que posso fazer?", "Mostrar gastos da categoria", "Ok, estou ciente"] });
                        }
                    }
                }
            }
        }
    }
    console.log('Daily financial checkup completed for all users.');
    return null;
});

// Helper functions for date manipulation
const startOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const endOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};


    
