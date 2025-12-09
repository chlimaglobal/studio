
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import { DocumentData } from "firebase-admin/firestore";
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
admin.initializeApp();
const db = admin.firestore();

/**
 * Gatilho do Firestore para enviar um e-mail quando um novo convite é criado.
 */
export const onInviteCreated = functions.firestore
  .document("invites/{inviteId}")
  .onCreate(async (snap, context) => {
    const inviteData = snap.data();
    if (!inviteData) {
      console.error("Dados do convite não encontrados.");
      return;
    }

    const { sentToEmail, sentByName, inviteToken } = inviteData;
    const inviteLink = `https://financeflow-42a59.web.app/signup?inviteToken=${inviteToken}`;

    const msg = {
      to: sentToEmail,
      from: "financeflowoficial@gmail.com", 
      subject: `[FinanceFlow] Você recebeu um convite de ${sentByName}!`,
      html: `
        <p>Olá,</p>
        <p>Você foi convidado(a) por <strong>${sentByName}</strong> para usar o FinanceFlow.</p>
        <p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
        <p><a href="${inviteLink}">Aceitar Convite</a></p>
        <p>Se você não estava esperando este convite, pode ignorar este e-mail.</p>
        <p>Atenciosamente,</p>
        <p>Equipe FinanceFlow</p>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log(`E-mail de convite enviado para ${sentToEmail}`);
    } catch (error) {
      console.error("Erro ao enviar e-mail pelo SendGrid:", error);
    }
  });


/**
 * Função callable para enviar convite de parceiro
 */
export const sendPartnerInvite = functions.runWith({ secrets: ["SENDGRID_API_KEY"] }).https.onCall(
  async (data, context) => {
    const { partnerEmail, senderName } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "O usuário precisa estar autenticado para enviar convites."
      );
    }

    if (!partnerEmail || !senderName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Parâmetros inválidos ao enviar convite."
      );
    }

    const inviteToken = db.collection("invites").doc().id;

    const inviteData = {
      sentBy: context.auth.uid,
      sentByName: senderName,
      sentByEmail: context.auth.token.email,
      sentToEmail: partnerEmail,
      status: "pending",
      createdAt: new Date(),
      inviteToken: inviteToken // Adiciona o token ao documento
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

      batch.update(userDocRef, {
        coupleId: admin.firestore.FieldValue.delete(),
        memberIds: [userId]
      });

      if (partnerId) {
        const partnerDocRef = db.collection("users").doc(partnerId);
        batch.update(partnerDocRef, {
          coupleId: admin.firestore.FieldValue.delete(),
          memberIds: [partnerId]
        });
      }

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
 */
export const onTransactionCreated = functions.firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    if (!snap.exists) return null;

    const { userId } = context.params;
    const userDocRef = db.doc(`users/${userId}`);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const userData = userDoc.data();

        if (userData?.isDependent) return;

        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");
        const lastAlertedMonth = userData?.mesAlertadoRenda;

        if (lastAlertedMonth !== currentMonthKey) {
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);

          const transactionsRef = db.collection(`users/${userId}/transactions`);
          const snapshot = await transactionsRef
            .where("date", ">=", monthStart)
            .where("date", "<=", monthEnd)
            .get();

          if (snapshot.empty) return;

          let totalIncome = 0;
          let totalExpenses = 0;

          const investmentCategories = [
            "Ações", "Fundos Imobiliários", "Renda Fixa",
            "Aplicação", "Retirada", "Proventos",
            "Juros", "Rendimentos"
          ];

          snapshot.forEach((doc) => {
            const tx = doc.data();

            if (!tx.category || investmentCategories.includes(tx.category)) return;

            const amount = Number(tx.amount);
            if (!Number.isFinite(amount)) return;

            if (tx.type === "income") {
              totalIncome += amount;
            } else {
              totalExpenses += amount;
            }
          });

          if (totalExpenses > totalIncome) {
            transaction.update(userDocRef, { mesAlertadoRenda: currentMonthKey });

            const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas. Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;

            const chatDocRef = db.collection(`users/${userId}/chat`).doc();
            await db.batch().set(chatDocRef, {
              role: "alerta",
              text: messageText,
              authorName: "Lúmina",
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              suggestions: [
                "Sim, mostre o plano",
                "Onde estou gastando mais?",
                "Ignorar por enquanto"
              ],
            }).commit();
          }
        }
      });
    } catch (error) {
      console.error(`Erro em onTransactionCreated para usuário ${userId}:`, error);
    }
    return null; // Adicionado para garantir que a função sempre retorne algo
  });


/**
 * Função agendada para rodar diariamente
 */
export const dailyFinancialCheckup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {

    let lastVisible = null as functions.firestore.QueryDocumentSnapshot | null;
    const pageSize = 100;
    let pageCount = 0;

    while (true) {
      pageCount++;
      let query = db.collection('users')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);

      if (lastVisible) {
        query = query.startAfter(lastVisible);
      }

      const usersSnapshot = await query.get();
      if (usersSnapshot.empty) break;

      lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      const processingPromises: Promise<void>[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const promise = (async () => {
          const userId = userDoc.id;
          let userData = userDoc.data();

          const userDocRef = db.collection("users").doc(userId);

          try {
            if (userData.isDependent) return;

            const now = new Date();
            const currentMonthKey = format(now, "yyyy-MM");

            let updates: { [key: string]: any } = {};
            const chatBatch = db.batch();
            let chatMessagesCount = 0;

            const sixtyDaysAgo = subDays(now, 60);
            const transactionsSnapshot = await db.collection(`users/${userId}/transactions`)
              .where('date', '>=', sixtyDaysAgo)
              .get();

            const transactions = transactionsSnapshot.docs
              .map(doc => {
                const data = doc.data();
                const txDate = data.date?.toDate ? data.date.toDate() : new Date(0);
                const amount = Number(data.amount);
                return {
                  ...data,
                  date: txDate,
                  amount: Number.isFinite(amount) ? amount : 0
                };
              })
              .filter(t => t.date.getTime() > 0 && t.amount > 0);

            const yesterdayStart = startOfDay(subDays(now, 1));
            const yesterdayEnd = endOfDay(subDays(now, 1));

            const recentExpenses = transactions.filter(t =>
              t.type === 'expense' &&
              t.date >= yesterdayStart &&
              t.date <= yesterdayEnd
            );

            const categoryAverages: { [key: string]: { total: number, count: number } } = {};
            transactions
              .filter(t => t.type === 'expense' && t.category && t.date < yesterdayStart)
              .forEach(t => {
                const category = t.category;
                if (!categoryAverages[category]) {
                  categoryAverages[category] = { total: 0, count: 0 };
                }
                categoryAverages[category].total += t.amount;
                categoryAverages[category].count += 1;
              });

            for (const transaction of recentExpenses) {
              const category = transaction.category;
              if (!category || transaction.amount <= 500) continue;

              const outOfPatternAlertKey =
                `alert_outOfPattern_${currentMonthKey}_${category}`;

              if (userData?.[outOfPatternAlertKey] || updates[outOfPatternAlertKey]) continue;

              const stats = categoryAverages[category];
              if (stats && stats.count > 5) {
                const average = stats.total / stats.count;
                if (transaction.amount > average * 3) {
                  updates[outOfPatternAlertKey] = true;
                  const messageText = `🚨 Detectei uma despesa fora do padrão em ${category}. Quer que eu investigue isso pra você?`;
                  const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                  chatBatch.set(newChatDocRef, {
                    role: "alerta",
                    text: messageText,
                    authorName: "Lúmina",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    suggestions: [
                      "Sim, detalhe",
                      "Foi um gasto pontual",
                      "Ok, obrigado"
                    ],
                  });
                  chatMessagesCount++;
                }
              }
            }

            if (Object.keys(updates).length > 0) {
              await userDocRef.update(updates);
              userData = { ...userData, ...updates };
              updates = {};
            }

            const oneWeekAgo = subDays(now, 7);
            const weeklyExpenses = transactions.filter(t =>
              t.type === 'expense' && t.date >= oneWeekAgo
            );

            const categoryCounts: { [key: string]: number } = {};
            weeklyExpenses.forEach(t => {
              if (t.category) {
                categoryCounts[t.category] =
                  (categoryCounts[t.category] || 0) + 1;
              }
            });

            for (const category in categoryCounts) {
              if (categoryCounts[category] > 3) {
                const unusualRecurrenceAlertKey =
                  `alert_unusualRecurrence_${currentMonthKey}_${category}`;

                if (userData?.[unusualRecurrenceAlertKey] ||
                  updates[unusualRecurrenceAlertKey]) continue;

                updates[unusualRecurrenceAlertKey] = true;
                const messageText =
                  `📌 Você fez ${categoryCounts[category]} despesas recentes em ${category}. Esse comportamento está acima da sua média.`;

                const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                chatBatch.set(newChatDocRef, {
                  role: "alerta",
                  text: messageText,
                  authorName: "Lúmina",
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  suggestions: [
                    "Ver transações",
                    "Definir orçamento",
                    "Entendido"
                  ],
                });
                chatMessagesCount++;
              }
            }

            if (Object.keys(updates).length > 0) {
              await userDocRef.update(updates);
              userData = { ...userData, ...updates };
              updates = {};
            }

            const budgetsDocRef =
              db.doc(`users/${userId}/budgets/${currentMonthKey}`);
            const budgetsDoc = await budgetsDocRef.get();

            if (budgetsDoc.exists) {
              const budgetsData = budgetsDoc.data()!;
              const monthStart = startOfMonth(now);
              const monthlyExpensesByCategory: { [key: string]: number } = {};

              transactions
                .filter(t => t.type === 'expense' && t.date >= monthStart)
                .forEach(t => {
                  if (t.category) {
                    monthlyExpensesByCategory[t.category] =
                      (monthlyExpensesByCategory[t.category] || 0) + t.amount;
                  }
                });

              for (const category in budgetsData) {
                const categoryBudget = Number(budgetsData[category]);
                if (!Number.isFinite(categoryBudget) || categoryBudget <= 0) continue;

                const totalCategorySpending =
                  monthlyExpensesByCategory[category] || 0;

                const spendingPercentage =
                  (totalCategorySpending / categoryBudget) * 100;

                const alertKey100 =
                  `alert_100_${currentMonthKey}_${category}`;

                if (spendingPercentage >= 100 &&
                  !(userData?.[alertKey100] || updates[alertKey100])) {

                  updates[alertKey100] = true;
                  const messageText =
                    `🟥 Meta de gastos para ${category} ultrapassada. Preciso ajustar o plano.`;

                  const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                  chatBatch.set(newChatDocRef, {
                    role: "alerta",
                    text: messageText,
                    authorName: "Lúmina",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    suggestions: [
                      "Me ajude a cortar gastos",
                      "O que aconteceu?",
                      "Ok"
                    ]
                  });
                  chatMessagesCount++;

                } else {
                  const alertKey80 =
                    `alert_80_${currentMonthKey}_${category}`;

                  if (spendingPercentage >= 80 &&
                    !(userData?.[alertKey80] || updates[alertKey80])) {

                    updates[alertKey80] = true;
                    const messageText =
                      `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${category}. Sugiro revisar suas próximas despesas.`;

                    const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                    chatBatch.set(newChatDocRef, {
                      role: "alerta",
                      text: messageText,
                      authorName: "Lúmina",
                      timestamp: admin.firestore.FieldValue.serverTimestamp(),
                      suggestions: [
                        "O que posso fazer?",
                        "Mostrar gastos da categoria",
                        "Ok, estou ciente"
                      ]
                    });
                    chatMessagesCount++;
                  }
                }
              }
            }

            if (chatMessagesCount > 0) {
              await chatBatch.commit();
            }

            if (Object.keys(updates).length > 0) {
              await userDocRef.update(updates);
            }

          } catch (error) {
            console.error(
              `Erro na verificação diária para o usuário ${userId}:`,
              error
            );
          }
        })();

        processingPromises.push(promise);
      }

      await Promise.all(processingPromises);
      console.log(`Verificação diária concluída para página ${pageCount}.`);
    }

    console.log(`Verificação concluída para todos os usuários.`);
    return null;
  });

    