
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as sgMail from "@sendgrid/mail";
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";

// Genkit Imports
import { genkit, Flow, run, defineFlow, ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { z } from 'zod';
import { Message } from "genkit/experimental/ai";

import {
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    ExtractTransactionInputSchema,
    ExtractTransactionOutputSchema,
    GenerateFinancialAnalysisInputSchema,
    GenerateFinancialAnalysisOutputSchema,
    ExtractFromFileInputSchema,
    ExtractFromFileOutputSchema,
    InvestorProfileInputSchema,
    InvestorProfileOutputSchema,
    SavingsGoalInputSchema,
    SavingsGoalOutputSchema,
    MediateGoalsInputSchema,
    MediateGoalsOutputSchema,
    ExtractFromImageInputSchema,
    ExtractFromImageOutputSchema,
    LuminaChatInputSchema,
    LuminaChatOutputSchema,
    ExtractMultipleTransactionsInputSchema,
    ExtractMultipleTransactionsOutputSchema
} from './types';
import { LUMINA_BASE_PROMPT, LUMINA_DIAGNOSTIC_PROMPT, LUMINA_VOICE_COMMAND_PROMPT, LUMINA_SPEECH_SYNTHESIS_PROMPT } from './prompts/luminaBasePrompt';
import { transactionCategories } from './types';
import { getFinancialMarketData } from './services/market-data';
import { LUMINA_GOALS_SYSTEM_PROMPT } from './prompts/luminaGoalsPrompt';
import { alexaWebhook as alexaWebhookV1 } from './alexa';

// Define Secrets for v2
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
export const db = admin.firestore();

// Lazy initialization for Genkit to access secrets at runtime
let aiInstance: any;
function getAI() {
    if (!aiInstance) {
        try {
            genkit({
                plugins: [
                    firebase(),
                    googleAI({ apiKey: geminiApiKey.value() }),
                ],
                enableTracingAndMetrics: true,
            });
            aiInstance = ai;
        } catch(e) {
            console.error("CRITICAL: Genkit initialization failed.", e);
            throw new HttpsError('internal', 'AI service initialization failed.');
        }
    }
    return aiInstance;
}


// Set SendGrid API key at runtime
sgMail.setApiKey(sendgridApiKey.value());

// Global options for functions
const functionOptions = {
    region: "us-central1",
    secrets: [geminiApiKey, sendgridApiKey],
    memory: "1GiB" as const,
};

// -----------------
// Genkit Flows (Defined Globally)
// -----------------

const categorizeTransactionFlow = defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

**Descrição da Transação:** ${input.description}
`;
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash',
      prompt: prompt,
      output: { format: 'json', schema: CategorizeTransactionOutputSchema },
    });
    const output = llmResponse.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu processar a categorização.');
    return output;
  }
);

const extractTransactionFromTextFlow = defineFlow(
  {
    name: 'extractTransactionFromTextFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, uma assistente financeira especialista em interpretar texto. Sua tarefa é extrair detalhes de transações e NUNCA falhar.

  **Sua Missão:**
  1.  **Extraia os Dados:** Analise o texto para obter: descrição, valor, tipo e parcelamento.
  2.  **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico.
      - Se o tipo não for claro, assuma 'expense' (despesa).
  3.  **Retorne um JSON Válido, SEMPRE.**
  4.  **Cálculo de Parcelas:** Se o usuário mencionar "em 10 vezes", "10x", etc., 'paymentMethod' é 'installments' e 'installments' é "10".

  **Texto do usuário para análise:**
  ${input.text}
  `;
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash',
      prompt: prompt,
      output: { format: 'json', schema: ExtractTransactionOutputSchema },
    });
    let output = llmResponse.output;
    if (!output || !output.description || !output.type) {
      output = { description: input.text, amount: 0, type: 'expense', category: 'Outros', paymentMethod: 'one-time' };
    }
    return output;
  }
);

const extractMultipleTransactionsFlow = defineFlow(
  {
    name: 'extractMultipleTransactionsFlow',
    inputSchema: ExtractMultipleTransactionsInputSchema,
    outputSchema: ExtractMultipleTransactionsOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, especialista em processar texto. Extraia todas as transações de cada linha do texto abaixo. Ignore linhas vazias. Para cada linha, extraia: descrição, valor e tipo (inferir 'expense' se não claro).

  **Categorias Disponíveis:**
  ${transactionCategories.join('\n- ')}

  **Texto do usuário:**
  ${input.text}
`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: ExtractMultipleTransactionsOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu processar o texto em lote.');
    return output;
  }
);


const generateFinancialAnalysisFlow = defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    if (!input.transactions || input.transactions.length === 0) {
      return { healthStatus: 'Atenção', diagnosis: 'Ainda não há transações suficientes para uma análise detalhada.', suggestions: [], trendAnalysis: undefined };
    }
    const prompt = LUMINA_DIAGNOSTIC_PROMPT + `
      ---
      **Dados das Transações do Usuário para Análise:**
      ${JSON.stringify(input.transactions)}

      Analise os dados e retorne o resultado no formato JSON solicitado.`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: GenerateFinancialAnalysisOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu gerar a análise financeira.');
    return output;
  }
);

const extractFromFileFlow = defineFlow(
  {
    name: 'extractFromFileFlow',
    inputSchema: ExtractFromFileInputSchema,
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, especialista em processar extratos bancários (CSV, OFX, PDF). Extraia todas as transações, inferindo o tipo ('income'/'expense') e a categoria. Retorne um JSON com a chave \`transactions\`.

  **Categorias Disponíveis:**
  ${transactionCategories.join('\n- ')}

  **Nome do Arquivo:** ${input.fileName}
  **Conteúdo do Arquivo:**
  (O conteúdo está na próxima parte da mensagem)
`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: [ { text: prompt }, { media: { url: input.fileContent } } ],
        output: { format: 'json', schema: ExtractFromFileOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu processar o arquivo.');
    return output;
  }
);

const getFinancialMarketDataTool = ai.defineTool(
    { name: 'getFinancialMarketData', description: 'Obtém dados e taxas atuais do mercado financeiro brasileiro.', outputSchema: z.object({ selicRate: z.number(), ipcaRate: z.number() }) },
    async () => getFinancialMarketData()
);

const analyzeInvestorProfileFlow = defineFlow(
  {
    name: 'analyzeInvestorProfileFlow',
    inputSchema: InvestorProfileInputSchema,
    outputSchema: InvestorProfileOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, especialista em análise de perfil de investidor. Analise as respostas, use a ferramenta \`getFinancialMarketDataTool\` para obter dados de mercado e determine o perfil de risco, sugira uma carteira e projete a rentabilidade.

      **Respostas do Usuário:**
      ${JSON.stringify(input.answers)}
    `;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        tools: [getFinancialMarketDataTool],
        output: { format: 'json', schema: InvestorProfileOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu processar a análise de perfil.');
    return output;
  }
);

const calculateSavingsGoalFlow = defineFlow(
  {
    name: 'calculateSavingsGoalFlow',
    inputSchema: SavingsGoalInputSchema,
    outputSchema: SavingsGoalOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    if (!input.transactions || input.transactions.length === 0) throw new HttpsError('failed-precondition', 'Não há transações suficientes para calcular uma meta.');
    const prompt = LUMINA_GOALS_SYSTEM_PROMPT + `
      ---
      **Dados das Transações do Usuário:**
      ${JSON.stringify(input.transactions)}

      Analise os dados e retorne o resultado em JSON.`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: SavingsGoalOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu calcular a meta de economia.');
    return output;
  }
);

const mediateGoalsFlow = defineFlow(
  {
    name: 'mediateGoalsFlow',
    inputSchema: MediateGoalsInputSchema,
    outputSchema: MediateGoalsOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é a Lúmina, terapeuta financeira de casais. Ajude a alinhar metas conflitantes.

  **Contexto:**
  - Poupança Mensal: ${input.sharedMonthlySavings}
  - Meta A: ${JSON.stringify(input.partnerAGoal)}
  - Meta B: ${JSON.stringify(input.partnerBGoal)}

  **Sua Tarefa:** Analise a viabilidade, crie um plano conjunto, escreva um resumo, elabore a análise e defina os próximos passos.
  `;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: MediateGoalsOutputSchema }
    });
    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu processar a mediação de metas.');
    return output;
  }
);

const extractFromImageFlow = defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractFromImageOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    const prompt = `Você é Lúmina, especialista em interpretar imagens financeiras (boletos, recibos, notas). Extraia os dados da imagem e retorne um JSON válido.

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

**Imagem para Análise:**
(A imagem está na próxima parte da mensagem)
`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: [ { text: prompt }, { media: { url: input.imageDataUri } } ],
        output: { format: 'json', schema: ExtractFromImageOutputSchema }
    });
    const output = result.output;
    if (!output || !output.description) return { description: 'Não foi possível ler a imagem', amount: 0, type: 'expense', category: 'Outros', paymentMethod: 'one-time' };
    return output;
  }
);

const luminaChatFlow = defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async function (input) {
    const ai = getAI();
    const userQuery = (input.userQuery || '').trim();
    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);

    const systemPrompt = [
      LUMINA_BASE_PROMPT,
      input.audioText ? LUMINA_VOICE_COMMAND_PROMPT : '',
      input.isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : '',
      '',
      '### CONTEXTO DO APP:',
      `- Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}`,
      `- Últimas transações:`,
      transactionsJSON,
    ].join('\n');

    const history: Message[] = (input.chatHistory || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'model')
      .map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          content: [{ text: msg.content || '' }]
      }));
    
    const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
    if (input.imageBase64) {
      lastUserMessageParts.push({
        media: {
            contentType: 'image/png',
            url: `data:image/png;base64,${input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`,
        },
      });
    }

    try {
        const result = await ai.generate({
            model: 'gemini-1.5-flash',
            system: systemPrompt,
            prompt: lastUserMessageParts,
            history: history,
            config: { temperature: 0.7 },
        });
        
        return {
          text: result.text || "Tudo bem! Como posso te ajudar hoje?",
          suggestions: [],
        };
        
    } catch (err: any) {
        console.error("ERRO GEMINI:", err.message);
        throw new HttpsError('internal', "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido?");
    }
  }
);


// -----------------
// Callable Functions Wrapper
// -----------------
const createGenkitCallable = <I, O>(flow: Flow<I, O>) => {
  return onCall(functionOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Autenticação necessária.');
    }
    
    const isAdmin = request.auth.token.email === 'digitalacademyoficiall@gmail.com';
    if (isAdmin) {
      // Admin bypass: Proceed directly to running the flow.
    } else {
        const coreFreeFlows = new Set([
            'categorizeTransactionFlow',
            'extractTransactionFromTextFlow',
        ]);
        
        if (coreFreeFlows.has(flow.name)) {
            // Free feature bypass: Proceed if the flow is in the free list.
        } else {
            // Premium Check: For all other flows, perform the subscription check.
            const userDoc = await db.collection('users').doc(request.auth.uid).get();
            const subStatus = userDoc.data()?.stripeSubscriptionStatus;
            const isPremiumUser = subStatus === 'active' || subStatus === 'trialing';

            if (!isPremiumUser) {
                throw new HttpsError('permission-denied', 'Assinatura Premium necessária para este recurso.');
            }
        }
    }
    
    try {
      const result = await run(flow, request.data as I);
      return { data: result }; // Always wrap result in a 'data' object
    } catch (e: any) {
      console.error(`Error in flow ${flow.name}:`, e);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError('internal', e.message || 'An error occurred while executing the AI flow.');
    }
  });
};

// Export Callable Functions
export const getCategorySuggestion = createGenkitCallable(categorizeTransactionFlow);
export const extractTransactionInfoFromText = createGenkitCallable(extractTransactionFromTextFlow);
export const extractMultipleTransactions = createGenkitCallable(extractMultipleTransactionsFlow);
export const runAnalysis = createGenkitCallable(generateFinancialAnalysisFlow);
export const runFileExtraction = createGenkitCallable(extractFromFileFlow);
export const runInvestorProfileAnalysis = createGenkitCallable(analyzeInvestorProfileFlow);
export const runSavingsGoalCalculation = createGenkitCallable(calculateSavingsGoalFlow);
export const runGoalMediation = createGenkitCallable(mediateGoalsFlow);
export const runImageExtraction = createGenkitCallable(extractFromImageFlow);
export const luminaChat = createGenkitCallable(luminaChatFlow);


// -----------------
// Original Firebase Functions (v2 Syntax)
// -----------------

export const handleUserLogin = onCall(functionOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    }
    console.log(`User login event processed for UID: ${request.auth.uid}`);
    return { data: { success: true, message: "Login event processed." } };
});

export const sendPartnerInvite = onCall(functionOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    
    const { partnerEmail, senderName } = request.data;
    if (!partnerEmail || !senderName) throw new HttpsError("invalid-argument", "Parâmetros inválidos ao enviar convite.");
    
    try {
      const inviteToken = db.collection("invites").doc().id;
      const inviteData = {
        sentBy: request.auth.uid,
        sentByName: senderName,
        sentByEmail: request.auth.token.email || null,
        sentToEmail: partnerEmail,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("invites").doc(inviteToken).set(inviteData);
      return { data: { success: true, inviteToken, message: "Convite criado com sucesso!" }};
    } catch (error) {
      console.error("Erro em sendPartnerInvite:", error);
      throw new HttpsError("internal", "Erro ao enviar convite.");
    }
});


export const onInviteCreated = onDocumentCreated({
    document: "invites/{inviteId}",
    region: functionOptions.region,
    secrets: [sendgridApiKey]
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    try {
      const invite = snap.data();
      if (!invite.sentToEmail) {
        return;
      }
      
      const msg = {
        to: invite.sentToEmail,
        from: { email: "no-reply@financeflow.app", name: "FinanceFlow" },
        subject: `Você recebeu um convite de ${invite.sentByName} para o Modo Casal!`,
        text: `Olá! ${invite.sentByName} (${invite.sentByEmail || 'um e-mail privado'}) convidou você para usar o Modo Casal no FinanceFlow. Acesse o aplicativo para visualizar e aceitar o convite.`,
        html: `<p>Olá!</p><p><strong>${invite.sentByName}</strong> convidou você para usar o <strong>Modo Casal</strong> no FinanceFlow.</p><p>Acesse o aplicativo para visualizar e aceitar o convite.</p>`,
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error("Erro ao enviar email de convite:", error);
    }
});

export const disconnectPartner = onCall(functionOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
    
    const userId = request.auth.uid;
    try {
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      const userData = userDoc.data();
      if (!userData || !userData.coupleId) throw new HttpsError("failed-precondition", "Você não está vinculado a um parceiro.");
      
      const coupleId = userData.coupleId;
      const coupleDocRef = db.collection("couples").doc(coupleId);
      const coupleDoc = await coupleDocRef.get();
      const members = coupleDoc.exists ? (coupleDoc.data()?.members || []) : [];
      const partnerId = members.find((id: string) => id !== userId);
      const batch = db.batch();
      batch.update(userDocRef, { coupleId: admin.firestore.FieldValue.delete(), memberIds: [userId] });
      if (partnerId) batch.update(db.collection("users").doc(partnerId), { coupleId: admin.firestore.FieldValue.delete(), memberIds: [partnerId] });
      batch.delete(coupleDocRef);
      await batch.commit();
      return { data: { success: true, message: "Desvinculação concluída." } };
    } catch (error) {
      console.error("Erro ao desvincular parceiro:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Erro inesperado ao desvincular.");
    }
});


export const checkDashboardStatus = onCall(functionOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    return { data: { success: true, message: "Verificação concluída." } };
  }
);

export const onTransactionCreated = onDocumentCreated({
    document: "users/{userId}/transactions/{transactionId}",
    region: functionOptions.region,
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { userId } = event.params;
    const userDocRef = db.doc(`users/${userId}`);
    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const userData = userDoc.data();
        if (userData?.isDependent) return;
        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");
        if (userData?.mesAlertadoRenda !== currentMonthKey) {
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          const snapshot = await db.collection(`users/${userId}/transactions`).where("date", ">=", monthStart).where("date", "<=", monthEnd).get();
          if (snapshot.empty) return;
          let totalIncome = 0;
          let totalExpenses = 0;
          const investmentCategories = ["Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação", "Retirada", "Proventos", "Juros", "Rendimentos"];
          snapshot.forEach((doc) => {
            const tx = doc.data();
            if (!tx.category || investmentCategories.includes(tx.category)) return;
            const amount = Number(tx.amount);
            if (!Number.isFinite(amount)) return;
            if (tx.type === "income") totalIncome += amount;
            else totalExpenses += amount;
          });
          if (totalExpenses > totalIncome) {
            transaction.update(userDocRef, { mesAlertadoRenda: currentMonthKey });
            const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas. Estou preparando um plano rápido para equilibrar isso. Deseja ver agora?`;
            const chatDocRef = db.collection(`users/${userId}/chat`).doc();
            await db.batch().set(chatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?", "Ignorar por enquanto"] }).commit();
          }
        }
      });
    } catch (error) {
      console.error(`Erro em onTransactionCreated para usuário ${userId}:`, error);
    }
    return null; 
});


export const dailyFinancialCheckup = onSchedule({
    schedule: 'every 24 hours',
    region: functionOptions.region,
    secrets: [geminiApiKey]
}, async (event) => {
    let lastVisible = null as admin.firestore.QueryDocumentSnapshot | null;
    const pageSize = 100;
    while (true) {
      let query = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (lastVisible) query = query.startAfter(lastVisible);
      const usersSnapshot = await query.get();
      if (usersSnapshot.empty) break;
      lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1];
      const processingPromises: Promise<void>[] = [];
      for (const userDoc of usersSnapshot.docs) {
        const promise = (async () => {
          const userId = userDoc.id;
          let userData = userDoc.data();
          const userDocRef = db.collection("users").doc(userId);
          
           const sendNotification = async (messageText: string, suggestions: string[]) => {
              const chatBatch = db.batch();
              const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
              chatBatch.set(newChatDocRef, { 
                  role: "alerta", 
                  text: messageText, 
                  authorName: "Lúmina", 
                  timestamp: admin.firestore.FieldValue.serverTimestamp(), 
                  suggestions: suggestions 
              });
              await chatBatch.commit();

              if (userData?.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                  const messagePayload = {
                      tokens: userData.fcmTokens,
                      data: {
                          title: 'FinanceFlow - Alerta Financeiro',
                          body: messageText,
                          url: '/dashboard'
                      },
                      apns: {
                        payload: {
                          aps: {
                            'content-available': 1,
                             alert: {
                                title: 'FinanceFlow - Alerta Financeiro',
                                body: messageText,
                             },
                             badge: 1,
                             sound: 'default'
                          },
                        },
                      },
                  };
                  try {
                      const response = await admin.messaging().sendEachForMulticast(messagePayload);
                      const tokensToRemove: string[] = [];
                      response.responses.forEach((result, index) => {
                        if (!result.success) {
                          const error = result.error;
                          if (error && (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered')) {
                            tokensToRemove.push(userData.fcmTokens[index]);
                          }
                        }
                      });
                      if (tokensToRemove.length > 0) {
                        await userDocRef.update({
                          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
                        });
                      }
                  } catch (error) {
                      console.error('Erro ao enviar notificação push:', error);
                  }
              }
          };

          try {
            if (userData.isDependent) return;
            const now = new Date();
            const currentMonthKey = format(now, "yyyy-MM");
            let updates: { [key: string]: any } = {};

            const sixtyDaysAgo = subDays(now, 60);
            const transactionsSnapshot = await db.collection(`users/${userId}/transactions`).where('date', '>=', sixtyDaysAgo).get();
            const transactions = transactionsSnapshot.docs.map(doc => { const data = doc.data(); return { ...data, date: data.date?.toDate ? data.date.toDate() : new Date(0), amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : 0 }; }).filter(t => t.date.getTime() > 0 && t.amount > 0);
            
            const yesterdayStart = startOfDay(subDays(now, 1));
            const yesterdayEnd = endOfDay(subDays(now, 1));
            const recentExpenses = transactions.filter(t => t.type === 'expense' && t.date >= yesterdayStart && t.date <= yesterdayEnd);
            
            const categoryAverages: { [key: string]: { total: number, count: number } } = {};
            transactions.filter(t => t.type === 'expense' && t.category && t.date < yesterdayStart).forEach(t => {
              const category = t.category;
              if (!categoryAverages[category]) categoryAverages[category] = { total: 0, count: 0 };
              categoryAverages[category].total += t.amount;
              categoryAverages[category].count += 1;
            });

            for (const transaction of recentExpenses) {
              const category = transaction.category;
              if (!category || transaction.amount <= 500) continue;
              const outOfPatternAlertKey = `alert_outOfPattern_${currentMonthKey}_${category}`;
              if (userData?.[outOfPatternAlertKey] || updates[outOfPatternAlertKey]) continue;
              const stats = categoryAverages[category];
              if (stats && stats.count > 5) {
                const average = stats.total / stats.count;
                if (transaction.amount > average * 3) {
                  updates[outOfPatternAlertKey] = true;
                  const messageText = `🚨 Detectei uma despesa fora do padrão em ${category}. Quer que eu investigue isso pra você?`;
                  await sendNotification(messageText, ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"]);
                }
              }
            }
            if (Object.keys(updates).length > 0) { await userDocRef.update(updates); userData = { ...userData, ...updates }; updates = {}; }

            const oneWeekAgo = subDays(now, 7);
            const weeklyExpenses = transactions.filter(t => t.type === 'expense' && t.date >= oneWeekAgo);
            const categoryCounts: { [key: string]: number } = {};
            weeklyExpenses.forEach(t => { if (t.category) categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1; });
            for (const category in categoryCounts) {
              if (categoryCounts[category] > 3) {
                const unusualRecurrenceAlertKey = `alert_unusualRecurrence_${currentMonthKey}_${category}`;
                if (userData?.[unusualRecurrenceAlertKey] || updates[unusualRecurrenceAlertKey]) continue;
                updates[unusualRecurrenceAlertKey] = true;
                const messageText = `📌 Você fez ${categoryCounts[category]} despesas recentes em ${category}. Esse comportamento está acima da sua média.`;
                await sendNotification(messageText, ["Ver transações", "Definir orçamento", "Entendido"]);
              }
            }
            if (Object.keys(updates).length > 0) { await userDocRef.update(updates); userData = { ...userData, ...updates }; updates = {}; }

            const budgetsDocRef = db.doc(`users/${userId}/budgets/${currentMonthKey}`);
            const budgetsDoc = await budgetsDocRef.get();
            if (budgetsDoc.exists) {
              const budgetsData = budgetsDoc.data()!;
              const monthStart = startOfMonth(now);
              const monthlyExpensesByCategory: { [key: string]: number } = {};
              transactions.filter(t => t.type === 'expense' && t.date >= monthStart).forEach(t => { if (t.category) monthlyExpensesByCategory[t.category] = (monthlyExpensesByCategory[t.category] || 0) + t.amount; });
              for (const category in budgetsData) {
                const categoryBudget = Number(budgetsData[category]);
                if (!Number.isFinite(categoryBudget) || categoryBudget <= 0) continue;
                const totalCategorySpending = monthlyExpensesByCategory[category] || 0;
                const spendingPercentage = (totalCategorySpending / categoryBudget) * 100;
                const alertKey100 = `alert_100_${currentMonthKey}_${category}`;
                if (spendingPercentage >= 100 && !(userData?.[alertKey100] || updates[alertKey100])) {
                  updates[alertKey100] = true;
                  const messageText = `🟥 Meta de gastos para ${category} ultrapassada. Preciso ajustar o plano.`;
                  await sendNotification(messageText, ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"]);
                } else {
                  const alertKey80 = `alert_80_${currentMonthKey}_${category}`;
                  if (spendingPercentage >= 80 && !(userData?.[alertKey80] || updates[alertKey80])) {
                    updates[alertKey80] = true;
                    const messageText = `⚠️ Você está prestes a atingir 100% da sua meta de gastos do mês em ${category}. Sugiro revisar suas próximas despesas.`;
                    await sendNotification(messageText, ["O que posso fazer?", "Mostrar gastos da categoria", "Ok, estou ciente"]);
                  }
                }
              }
            }
            if (Object.keys(updates).length > 0) await userDocRef.update(updates);
          } catch (error) {
            console.error(`Erro na verificação diária para o usuário ${userId}:`, error);
          }
        })();
        processingPromises.push(promise);
      }
      await Promise.all(processingPromises);
    }
    return null;
});

// Export the v1 handler for Alexa, as it uses a different signature
export const alexaWebhook = alexaWebhookV1;
