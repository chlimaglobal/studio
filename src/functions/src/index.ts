
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {format, startOfMonth, endOfMonth} from "date-fns";
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
 * Checks for financial health rules, like expenses exceeding income.
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

    // --- 🟧 ALERTA DE RISCO — gasto fora do padrão ---
    if (newTransaction.type === 'expense' && newTransaction.amount > 500) { // Limite de exemplo
        const categoryTransactionsQuery = db.collection(`users/${userId}/transactions`)
            .where('category', '==', newTransaction.category)
            .where('type', '==', 'expense');
            
        const categorySnapshot = await categoryTransactionsQuery.get();
        let total = 0;
        categorySnapshot.forEach(doc => total += doc.data().amount);
        const average = total / (categorySnapshot.size || 1);

        if (categorySnapshot.size > 5 && newTransaction.amount > average * 3) {
            const messageText = `🚨 Detectei uma despesa fora do padrão em ${newTransaction.category}. Quer que eu investigue isso pra você?`;
             await db.collection(`users/${userId}/chat`).add({
                role: "alerta", text: messageText, authorName: "Lúmina",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                suggestions: ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"],
            });
        }
    }

    // --- 🟨 ALERTA DE RECORRÊNCIA INCOMUM ---
    if (newTransaction.type === 'expense') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentRecurrenceQuery = db.collection(`users/${userId}/transactions`)
            .where('category', '==', newTransaction.category)
            .where('type', '==', 'expense')
            .where('date', '>=', sevenDaysAgo);
        
        const recentSnapshot = await recentRecurrenceQuery.get();
        if (recentSnapshot.size > 3) {
            const messageText = `📌 Você fez ${recentSnapshot.size} despesas recentes em ${newTransaction.category}. Esse comportamento está acima da sua média.`;
             await db.collection(`users/${userId}/chat`).add({
                role: "alerta", text: messageText, authorName: "Lúmina",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                suggestions: ["Ver transações", "Definir orçamento", "Entendido"],
            });
        }
    }
    
    // --- ⚠️ ALERTA DE LIMITE MENSAL (80% e 100%) ---
    const budgetsDocRef = db.doc(`users/${userId}/budgets/${currentMonthKey}`);
    const budgetsDoc = await budgetsDocRef.get();
    if (budgetsDoc.exists && newTransaction.category) {
        const budgetsData = budgetsDoc.data();
        if (budgetsData) {
            const categoryBudget = budgetsData[newTransaction.category];
            
            if (categoryBudget > 0) {
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);
                const categorySpendingQuery = db.collection(`users/${userId}/transactions`)
                    .where('category', '==', newTransaction.category)
                    .where('type', '==', 'expense')
                    .where('date', '>=', monthStart)
                    .where('date', '<=', monthEnd);
                    
                const categorySpendingSnapshot = await categorySpendingQuery.get();
                let totalCategorySpending = 0;
                categorySpendingSnapshot.forEach(doc => totalCategorySpending += doc.data().amount);
                
                const spendingPercentage = (totalCategorySpending / categoryBudget) * 100;
                
                const alertKey80 = `alert_80_${currentMonthKey}_${newTransaction.category}`;
                const alertKey100 = `alert_100_${currentMonthKey}_${newTransaction.category}`;

                if (spendingPercentage >= 100 && !userData?.[alertKey100]) {
                     await userDocRef.update({ [alertKey100]: true });
                     const messageText = `🟥 Meta de gastos para ${newTransaction.category} ultrapassada. Preciso ajustar o plano.`;
                     await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"] });
                } else if (spendingPercentage >= 80 && !userData?.[alertKey80]) {
                     await userDocRef.update({ [alertKey80]: true });
                     const messageText = `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${newTransaction.category}. Sugiro revisar suas próximas despesas.`;
                     await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["O que posso fazer?", "Mostrar gastos da categoria", "Ok, estou ciente"] });
                }
            }
        }
    }
    
    // As demais funções agendadas (cron jobs) permanecem como placeholders
    // para implementação futura, pois exigem uma configuração diferente.
    
    return null;
  });
