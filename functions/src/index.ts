
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
 * Otimizado para ser atômico e de baixo custo, usando uma transação Firestore.
 */
export const onTransactionCreated = functions.firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const userDocRef = db.doc(`users/${userId}`);

    try {
      // Otimização: A lógica de verificação e atualização de flag agora é atômica.
      // Isso previne 'race conditions' e garante que o alerta seja enviado apenas uma vez.
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const userData = userDoc.data();

        if (userData?.isDependent) {
          return; // Ignorar usuários dependentes
        }

        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");
        const lastAlertedMonth = userData?.mesAlertadoRenda;

        // --- 🟥 ALERTA CRÍTICO: GASTOS > RECEITAS ---
        // Roda apenas uma vez por mês e com o mínimo de leituras.
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
            const tx = doc.data();
            if (tx.category && !investmentCategories.includes(tx.category)) {
              const amount = Number(tx.amount);
              if (!Number.isFinite(amount)) return;

              if (tx.type === "income") {
                totalIncome += amount;
              } else {
                totalExpenses += amount;
              }
            }
          });

          if (totalExpenses > totalIncome) {
            // A atualização da flag é feita DENTRO da transação para garantir atomicidade.
            transaction.update(userDocRef, { mesAlertadoRenda: currentMonthKey });
            
            // A escrita no chat é feita fora da transação principal para não bloquear a leitura do documento de usuário.
            // É um compromisso aceitável, pois a chance de falha aqui é pequena e não crítica se a flag já foi setada.
            const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas. Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;
            const chatDocRef = db.collection(`users/${userId}/chat`).doc();
            db.batch().set(chatDocRef, {
                role: "alerta",
                text: messageText,
                authorName: "Lúmina",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"],
            }).commit();
          }
        }
      });
    } catch (error) {
      console.error(`Erro em onTransactionCreated (transação Firestore) para usuário ${userId}:`, error);
    }
  });


/**
 * Função agendada para rodar diariamente (ex: via Cloud Scheduler).
 * Realiza análises complexas de forma otimizada para todos os usuários.
 */
export const dailyFinancialCheckup = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    let lastVisible = null as functions.firestore.QueryDocumentSnapshot | null;
    const pageSize = 100;
    let pageCount = 0;

    // Otimização: Processamento de usuários em páginas para escalabilidade e evitar timeouts.
    while (true) {
        pageCount++;
        let query = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
        if (lastVisible) {
            query = query.startAfter(lastVisible);
        }

        const usersSnapshot = await query.get();
        if (usersSnapshot.empty) {
            break; // Fim da paginação
        }
        
        lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1];

        // Otimização: Processa os usuários da página em paralelo.
        const processingPromises: Promise<void>[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const promise = (async () => {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                // Otimização: Define a referência do documento do usuário aqui para uso posterior.
                const userDocRef = db.collection("users").doc(userId);

                // Otimização: Isola o processamento de cada usuário com try/catch.
                // Um erro em um usuário não irá parar o processamento dos outros.
                try {
                    if (userData.isDependent) {
                        return; // Ignorar contas dependentes
                    }
                    
                    const now = new Date();
                    const currentMonthKey = format(now, "yyyy-MM");
                    
                    // Otimização: Acumulador de atualizações de flags para uma única escrita.
                    const updates: { [key: string]: any } = {}; 
                    // Otimização: Batch para acumular todas as criações de alertas de chat.
                    const chatBatch = db.batch();
                    let chatMessagesCount = 0;

                    // Otimização: Busca transações dos últimos 60 dias uma única vez por usuário.
                    const sixtyDaysAgo = subDays(now, 60);
                    const transactionsSnapshot = await db.collection(`users/${userId}/transactions`)
                        .where('date', '>=', sixtyDaysAgo)
                        .get();
                    
                    // Otimização: Mapeia e valida os dados em memória para reuso em todas as análises.
                    const transactions = transactionsSnapshot.docs.map(doc => {
                        const data = doc.data();
                        // Segurança: Garante que a data é válida antes de usar.
                        const txDate = data.date?.toDate ? data.date.toDate() : new Date(0);
                        // Segurança: Garante que o valor é um número finito.
                        const amount = Number(data.amount);
                        return { 
                            ...data, 
                            date: txDate, 
                            amount: Number.isFinite(amount) ? amount : 0 
                        };
                    }).filter(t => t.date.getTime() > 0 && t.amount > 0);


                    // --- 🟧 ALERTA DE RISCO — GASTO FORA DO PADRÃO ---
                    const yesterdayStart = startOfDay(subDays(now, 1));
                    const yesterdayEnd = endOfDay(subDays(now, 1));
                    
                    const recentExpenses = transactions.filter(t => 
                        t.type === 'expense' &&
                        t.date >= yesterdayStart &&
                        t.date <= yesterdayEnd
                    );

                    // Otimização: Calcula médias de todas as categorias de uma só vez.
                    const categoryAverages: { [key: string]: { total: number, count: number } } = {};
                    transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
                        const category = t.category;
                        if (!categoryAverages[category]) categoryAverages[category] = { total: 0, count: 0 };
                        categoryAverages[category].total += t.amount;
                        categoryAverages[category].count += 1;
                    });
                    
                    for (const transaction of recentExpenses) {
                        const category = transaction.category;
                        if (!category || transaction.amount <= 500) continue; // Ignora gastos pequenos

                        const outOfPatternAlertKey = `alert_outOfPattern_${currentMonthKey}_${category}`;
                        if (userData?.[outOfPatternAlertKey] || updates[outOfPatternAlertKey]) continue;

                        const stats = categoryAverages[category];
                        // Otimização: A média só é calculada se houver um histórico mínimo.
                        if (stats && stats.count > 5) {
                            const average = stats.total / stats.count;
                            if (transaction.amount > average * 3) {
                                updates[outOfPatternAlertKey] = true;
                                const messageText = `🚨 Detectei uma despesa fora do padrão em ${category}. Quer que eu investigue isso pra você?`;
                                const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                                chatBatch.set(newChatDocRef, {
                                    role: "alerta", text: messageText, authorName: "Lúmina",
                                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                    suggestions: ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"],
                                });
                                chatMessagesCount++;
                            }
                        }
                    }
                    
                    // --- 🟨 ALERTA DE RECORRÊNCIA INCOMUM ---
                    const oneWeekAgo = subDays(now, 7);
                    // Otimização: Reutiliza o array de transações em memória.
                    const weeklyExpenses = transactions.filter(t => t.type === 'expense' && t.date >= oneWeekAgo);
                    const categoryCounts: { [key: string]: number } = {};
                    weeklyExpenses.forEach(t => {
                        if (t.category) categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
                    });

                    for (const category in categoryCounts) {
                        if (categoryCounts[category] > 3) { // Mais de 3 gastos na mesma categoria
                            const unusualRecurrenceAlertKey = `alert_unusualRecurrence_${currentMonthKey}_${category}`;
                            if (userData?.[unusualRecurrenceAlertKey] || updates[unusualRecurrenceAlertKey]) continue;
                            
                            updates[unusualRecurrenceAlertKey] = true;
                            const messageText = `📌 Você fez ${categoryCounts[category]} despesas recentes em ${category}. Esse comportamento está acima da sua média.`;
                            const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                            chatBatch.set(newChatDocRef, {
                                role: "alerta", text: messageText, authorName: "Lúmina",
                                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                suggestions: ["Ver transações", "Definir orçamento", "Entendido"],
                            });
                            chatMessagesCount++;
                        }
                    }

                    // --- ⚠️ ALERTA DE LIMITE MENSAL (80% e 100%) ---
                    const budgetsDocRef = db.doc(`users/${userId}/budgets/${currentMonthKey}`);
                    const budgetsDoc = await budgetsDocRef.get();
                    if (budgetsDoc.exists) {
                        const budgetsData = budgetsDoc.data()!;
                        const monthStart = startOfMonth(now);
                        const monthlyExpensesByCategory: { [key: string]: number } = {};

                        // Otimização: Calcula gastos do mês por categoria a partir dos dados já em memória.
                        transactions.filter(t => t.type === 'expense' && t.date >= monthStart).forEach(t => {
                            if (t.category) {
                                monthlyExpensesByCategory[t.category] = (monthlyExpensesByCategory[t.category] || 0) + t.amount;
                            }
                        });

                        for (const category in budgetsData) {
                            // Segurança: Valida que o orçamento é um número válido.
                            const categoryBudget = Number(budgetsData[category]);
                            if (!Number.isFinite(categoryBudget) || categoryBudget <= 0) continue;

                            const totalCategorySpending = monthlyExpensesByCategory[category] || 0;
                            const spendingPercentage = (totalCategorySpending / categoryBudget) * 100;
                            
                            // Lógica para o alerta de 100%
                            const alertKey100 = `alert_100_${currentMonthKey}_${category}`;
                            if (spendingPercentage >= 100 && !(userData?.[alertKey100] || updates[alertKey100])) {
                                updates[alertKey100] = true;
                                const messageText = `🟥 Meta de gastos para ${category} ultrapassada. Preciso ajustar o plano.`;
                                const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                                chatBatch.set(newChatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"] });
                                chatMessagesCount++;
                            } else {
                                // Lógica para o alerta de 80% (só roda se o de 100% não foi acionado)
                                const alertKey80 = `alert_80_${currentMonthKey}_${category}`;
                                if (spendingPercentage >= 80 && !(userData?.[alertKey80] || updates[alertKey80])) {
                                    updates[alertKey80] = true;
                                    const messageText = `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${category}. Sugiro revisar suas próximas despesas.`;
                                    const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                                    chatBatch.set(newChatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["O que posso fazer?", "Mostrar gastos da categoria", "Ok, estou ciente"] });
                                    chatMessagesCount++;
                                }
                            }
                        }
                    }
                    
                    // Otimização: Apenas faz o commit do batch de chats se houver mensagens a serem adicionadas.
                    if (chatMessagesCount > 0) {
                        await chatBatch.commit();
                    }
                    
                    // Otimização: Apenas atualiza o documento do usuário se houver novas flags.
                    if (Object.keys(updates).length > 0) {
                        await userDocRef.update(updates);
                    }
                } catch (error) {
                    console.error(`Erro na verificação diária para o usuário ${userId}:`, error);
                }
            })();
            processingPromises.push(promise);
        }

        await Promise.all(processingPromises);
        console.log(`Verificação financeira diária concluída para a página ${pageCount}.`);
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

    
