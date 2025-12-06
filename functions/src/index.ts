
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
 * Gatilho leve acionado em cada nova transação.
 * Executa apenas a verificação mais crítica: despesas totais > receitas totais.
 */
export const onTransactionCreated = functions.firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const userDocRef = db.doc(`users/${userId}`);

    try {
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();

        // Ignorar usuários dependentes
        if (userData?.isDependent) {
            return null;
        }

        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");
        const lastAlertedMonth = userData?.mesAlertadoRenda;

        // --- 🟥 ALERTA CRÍTICO: GASTOS > RECEITAS ---
        // Otimizado para rodar apenas uma vez por mês e com o mínimo de leituras.
        if (lastAlertedMonth !== currentMonthKey) {
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);

            const transactionsRef = db.collection(`users/${userId}/transactions`);
            const query = transactionsRef.where("date", ">=", monthStart).where("date", "<=", monthEnd);
            const snapshot = await query.get();
            
            let totalIncome = 0;
            let totalExpenses = 0;
            const investmentCategories = ["Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação", "Retirada", "Proventos", "Juros", "Rendimentos"];

            snapshot.forEach((doc) => {
                const transaction = doc.data();
                if (transaction.category && !investmentCategories.includes(transaction.category)) {
                    const amount = Number(transaction.amount) || 0;
                    if (transaction.type === "income") {
                        totalIncome += amount;
                    } else {
                        totalExpenses += amount;
                    }
                }
            });

            if (totalExpenses > totalIncome) {
                const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas. Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;
                await db.collection(`users/${userId}/chat`).add({
                    role: "alerta",
                    text: messageText,
                    authorName: "Lúmina",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"],
                });
                await userDocRef.update({ mesAlertadoRenda: currentMonthKey });
            }
        }
    } catch (error) {
        console.error(`Erro em onTransactionCreated para usuário ${userId}:`, error);
    }
    
    return null;
  });


/**
 * Função agendada para rodar diariamente.
 * Realiza análises complexas de forma otimizada para todos os usuários.
 */
export const dailyFinancialCheckup = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Ignorar contas dependentes
        if (userData.isDependent) {
            continue;
        }

        console.log(`Executando verificação diária para o usuário ${userId}`);
        
        try {
            const now = new Date();
            const currentMonthKey = format(now, "yyyy-MM");
            const updates: { [key: string]: any } = {}; // Objeto para acumular atualizações de flags

            // Otimização: Buscar transações dos últimos 60 dias uma única vez por usuário
            const sixtyDaysAgo = subDays(now, 60);
            const transactionsSnapshot = await db.collection(`users/${userId}/transactions`)
                .where('date', '>=', sixtyDaysAgo)
                .get();
            const transactions = transactionsSnapshot.docs.map(doc => doc.data());

            // --- 🟧 ALERTA DE RISCO — GASTO FORA DO PADRÃO ---
            const yesterdayStart = startOfDay(subDays(now, 1));
            const yesterdayEnd = endOfDay(subDays(now, 1));
            const recentExpenses = transactions.filter(t => 
                t.type === 'expense' &&
                t.date.toDate() >= yesterdayStart &&
                t.date.toDate() <= yesterdayEnd
            );

            // Calcular médias para as categorias relevantes de uma só vez
            const categoryAverages: { [key: string]: { total: number, count: number } } = {};
            transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
                const category = t.category;
                const amount = Number(t.amount) || 0;
                if (!categoryAverages[category]) categoryAverages[category] = { total: 0, count: 0 };
                categoryAverages[category].total += amount;
                categoryAverages[category].count += 1;
            });
            
            for (const transaction of recentExpenses) {
                const category = transaction.category;
                const amount = Number(transaction.amount) || 0;
                if (!category || amount <= 500) continue; // Adicionada checagem para evitar erros

                const outOfPatternAlertKey = `alert_outOfPattern_${currentMonthKey}_${category}`;
                if (userData?.[outOfPatternAlertKey]) continue;

                const stats = categoryAverages[category];
                if (stats && stats.count > 5) {
                    const average = stats.total / stats.count;
                    if (amount > average * 3) {
                        updates[outOfPatternAlertKey] = true;
                        const messageText = `🚨 Detectei uma despesa fora do padrão em ${category}. Quer que eu investigue isso pra você?`;
                        await db.collection(`users/${userId}/chat`).add({
                            role: "alerta", text: messageText, authorName: "Lúmina",
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            suggestions: ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"],
                        });
                    }
                }
            }
            
            // --- 🟨 ALERTA DE RECORRÊNCIA INCOMUM ---
            const oneWeekAgo = subDays(now, 7);
            const weeklyExpenses = transactions.filter(t => t.type === 'expense' && t.date.toDate() >= oneWeekAgo);
            const categoryCounts: { [key: string]: number } = {};
            weeklyExpenses.forEach(t => {
                if (t.category) categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
            });

            for (const category in categoryCounts) {
                if (categoryCounts[category] > 3) {
                    const unusualRecurrenceAlertKey = `alert_unusualRecurrence_${currentMonthKey}_${category}`;
                    if (userData?.[unusualRecurrenceAlertKey]) continue;
                    
                    updates[unusualRecurrenceAlertKey] = true;
                    const messageText = `📌 Você fez ${categoryCounts[category]} despesas recentes em ${category}. Esse comportamento está acima da sua média.`;
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
            if (budgetsDoc.exists) {
                const budgetsData = budgetsDoc.data()!;
                const monthStart = startOfMonth(now);
                const monthlyExpensesByCategory: { [key: string]: number } = {};

                transactions.filter(t => t.type === 'expense' && t.date.toDate() >= monthStart).forEach(t => {
                    if (t.category) {
                        const amount = Number(t.amount) || 0;
                        monthlyExpensesByCategory[t.category] = (monthlyExpensesByCategory[t.category] || 0) + amount;
                    }
                });

                for (const category in budgetsData) {
                    const categoryBudget = Number(budgetsData[category]) || 0;
                    if (categoryBudget > 0) {
                        const totalCategorySpending = monthlyExpensesByCategory[category] || 0;
                        const spendingPercentage = (totalCategorySpending / categoryBudget) * 100;
                        
                        const alertKey100 = `alert_100_${currentMonthKey}_${category}`;
                        if (spendingPercentage >= 100 && !userData?.[alertKey100]) {
                            updates[alertKey100] = true;
                            const messageText = `🟥 Meta de gastos para ${category} ultrapassada. Preciso ajustar o plano.`;
                            await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"] });
                        } else {
                            const alertKey80 = `alert_80_${currentMonthKey}_${category}`;
                            if (spendingPercentage >= 80 && !userData?.[alertKey80]) {
                                updates[alertKey80] = true;
                                const messageText = `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${category}. Sugiro revisar suas próximas despesas.`;
                                await db.collection(`users/${userId}/chat`).add({ role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["O que posso fazer?", "Mostrar gastos da categoria", "Ok, estou ciente"] });
                            }
                        }
                    }
                }
            }

            // Otimização: Fazer um único update no documento do usuário com todas as flags acumuladas
            if (Object.keys(updates).length > 0) {
                await userDoc.ref.update(updates);
            }
        } catch (error) {
             console.error(`Erro na verificação diária para o usuário ${userId}:`, error);
        }
    }
    console.log('Verificação financeira diária concluída para todos os usuários.');
    return null;
});

// Funções auxiliares de data para garantir consistência
const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

    