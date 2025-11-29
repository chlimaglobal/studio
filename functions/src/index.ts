
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
    const newTransaction = snap.data();

    const userDocRef = db.doc(`users/${userId}`);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    // Do not run for dependents
    if (userData?.isDependent) {
      return null;
    }

    // --- 🟥 ALERTA CRÍTICO: GASTOS > RECEITAS ---
    const now = new Date();
    const currentMonthKey = format(now, "yyyy-MM");
    const lastAlertedMonth = userData?.mesAlertadoRenda;

    if (lastAlertedMonth !== currentMonthKey) {
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
                    authorName: "Lúmina (Alerta Automático)",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"],
                });

                await userDocRef.update({ mesAlertadoRenda: currentMonthKey });

            } catch (error) {
                console.error("Erro ao enviar alerta de balanço negativo:", error);
            }
        }
    }

    // --- PLACEHOLDER PARA NOVOS ALERTAS E LEMBRETES ---

    // 🟧 ALERTA DE RISCO — gasto fora do padrão
    // Lógica a ser implementada:
    // 1. Buscar transações recentes na mesma categoria da newTransaction.
    // 2. Calcular a média de gastos para essa categoria.
    // 3. Se newTransaction.amount for X vezes maior que a média, enviar alerta.
    // ex: if (newTransaction.amount > mediaDaCategoria * 3) { ...enviar alerta... }

    // 🟨 ALERTA DE RECORRÊNCIA INCOMUM
    // Lógica a ser implementada:
    // 1. Buscar transações recentes (últimos 3-7 dias).
    // 2. Contar quantas são da mesma categoria da newTransaction.
    // 3. Se a contagem > 3, enviar alerta.

    // 🟦 ALERTA DO PLANO MENSAL
    // Lógica a ser implementada:
    // 1. Buscar a meta de economia do usuário para o mês.
    // 2. Calcular o progresso atual versus o esperado para o dia do mês.
    // 3. Se estiver significativamente atrás, projetar o resultado final e, se for o caso, enviar o alerta.

    // ⏰ LEMBRETE DE META DIÁRIA (Função Agendada - Ex: rodar todo dia às 9h)
    // 1. Para cada usuário, buscar sua meta de economia mensal.
    // 2. Calcular o gasto diário máximo permitido para atingir a meta.
    // 3. Calcular o gasto real do dia.
    // 4. Enviar notificação com o resumo.

    // 📅 LEMBRETE DE PAGAMENTO (Função Agendada - Ex: rodar todo dia)
    // 1. Buscar transações recorrentes e contas a pagar com vencimento próximo (D-1, D-3).
    // 2. Analisar histórico para identificar padrões de pagamento.
    // 3. Enviar lembrete via notificação.

    // 💡 LEMBRETE DE INVESTIMENTO (Função Agendada ou Trigger de Receita)
    // 1. Ao receber uma receita grande (ex: salário) ou em uma rotina mensal.
    // 2. Calcular o balanço atual do mês.
    // 3. Se houver um excedente significativo, sugerir o investimento.

    // --- PLACEHOLDER PARA TRIGGERS DE MONITORAMENTO CONTÍNUO ---

    // ⚠️ ALERTA DE LIMITE MENSAL (80% e 100%)
    // Lógica a ser implementada:
    // 1. Buscar o orçamento definido para a categoria da newTransaction.
    // 2. Calcular o total gasto na categoria no mês atual.
    // 3. Se o total atingir 80% do orçamento, enviar alerta de "próximo ao limite".
    // 4. Se o total ultrapassar 100%, enviar alerta de "limite ultrapassado".
    
    // 📉 ALERTA DE PROJEÇÃO NEGATIVA
    // Lógica a ser implementada:
    // 1. Calcular o ritmo de gastos diário do usuário.
    // 2. Projetar o gasto total até o fim do mês.
    // 3. Se a projeção de (receitas - despesas) for negativa, enviar alerta com o déficit estimado.

    // 📈 ANÁLISE FINANCEIRA PROATIVA
    // Lógica a ser implementada em rotina agendada ou em triggers complexos:
    // 1. Calcular média de gastos por categoria.
    // 2. Prever gastos para os próximos 30 dias.
    // 3. Projetar o saldo final do mês.
    // 4. Calcular o ponto de ruptura (dia em que o dinheiro pode acabar).
    // 5. Avaliar a capacidade de investimento com base no excedente.
    // 6. Enviar notificações se houver mudanças significativas nesses indicadores.
    
    return null;
  });

    

    