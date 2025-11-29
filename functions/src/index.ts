
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {format, startOfMonth, endOfMonth} from "date-fns";

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
      
      const coupleData = coupleDoc.data();
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
    
    // Este é um placeholder. A lógica real de análise e alerta seria implementada aqui.
    // Por exemplo, buscar transações, passar para a IA, e se necessário,
    // usar o Firebase Cloud Messaging para enviar uma notificação.
    
    console.log(`Rotina de verificação diária para o usuário: ${context.auth.uid}`);
    
    // Retorna um sucesso simples por enquanto.
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

    const userDocRef = db.doc(`users/${userId}`);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    // Do not run for dependents
    if (userData?.isDependent) {
      return null;
    }

    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const lastAlertedMonth = userData?.mesAlertadoRenda;

    // Se já foi alertado este mês, não faz nada
    if (lastAlertedMonth === currentMonthKey) {
      return null;
    }

    // Buscar todas as transações do mês atual
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const transactionsRef = db
      .collection(`users/${userId}/transactions`);
    const query = transactionsRef
      .where("date", ">=", monthStart)
      .where("date", "<=", monthEnd);

    const snapshot = await query.get();
    
    let totalIncome = 0;
    let totalExpenses = 0;

    snapshot.forEach((doc) => {
      const transaction = doc.data();
      // Excluir investimentos do cálculo de fluxo de caixa
      if (transaction.category && !["Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação", "Retirada", "Proventos", "Juros", "Rendimentos"].includes(transaction.category)) {
          if (transaction.type === "income") {
            totalIncome += transaction.amount;
          } else {
            totalExpenses += transaction.amount;
          }
      }
    });

    // Se despesas ultrapassam receitas
    if (totalExpenses > totalIncome) {
      try {
        const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas.
Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;

        // Adiciona a mensagem ao chat da Lúmina
        await db.collection(`users/${userId}/chat`).add({
          role: "alerta",
          text: messageText,
          authorName: "Lúmina (Alerta Automático)",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"],
        });

        // Marca que o alerta foi enviado este mês para não repetir
        await userDocRef.update({ mesAlertadoRenda: currentMonthKey });

      } catch (error) {
        console.error("Erro ao enviar alerta de balanço negativo:", error);
      }
    }
    
    return null;
  });

