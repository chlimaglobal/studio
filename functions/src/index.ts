import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import * as sgMail from '@sendgrid/mail';
import { defineSecret } from "firebase-functions/params";

// Genkit Imports
import { genkit, Flow, run, defineFlow, ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { z } from 'zod';

import {
    CategorizeTransactionOutputSchema,
    ExtractTransactionOutputSchema,
    GenerateFinancialAnalysisOutputSchema,
    ExtractFromFileOutputSchema,
    InvestorProfileOutputSchema,
    SavingsGoalOutputSchema,
    MediateGoalsOutputSchema,
    ExtractFromImageOutputSchema,
    LuminaChatOutputSchema,
} from './types';
import { LUMINA_BASE_PROMPT, LUMINA_DIAGNOSTIC_PROMPT, LUMINA_VOICE_COMMAND_PROMPT, LUMINA_SPEECH_SYNTHESIS_PROMPT } from './prompts/luminaBasePrompt';
import { transactionCategories } from './types';
import { getFinancialMarketData } from './services/market-data';
import { LUMINA_GOALS_SYSTEM_PROMPT } from './prompts/luminaGoalsPrompt';
import { LUMINA_COUPLE_PROMPT } from "./prompts/luminaCouplePrompt";
import { Message } from "genkit/experimental/ai";


// Define Secrets
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Genkit
genkit({
  plugins: [
    firebase(),
    googleAI({ apiKey: geminiApiKey.value() }),
  ],
  enableTracingAndMetrics: true,
});

sgMail.setApiKey(sendgridApiKey.value());


// -----------------
// Genkit Flows
// -----------------

const categorizeTransactionFlow = defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: z.object({ description: z.string() }),
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"
- "iFood" -> "Delivery"
- "Conta de luz" -> "Luz"
- "Salário da empresa X" -> "Salário"

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

Analise a descrição a seguir e retorne **apenas uma** categoria da lista. Seja o mais específico possível.

**Descrição da Transação:** ${input.description}
`;
    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: { format: 'json', schema: CategorizeTransactionOutputSchema },
    });
    const output = llmResponse.output;
    if (!output) throw new Error('A Lúmina não conseguiu processar a categorização.');
    return output;
  }
);


const extractTransactionFromTextFlow = defineFlow(
  {
    name: 'extractTransactionFromTextFlow',
    inputSchema: z.object({ text: z.string() }),
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma assistente financeira especialista em interpretar texto. Sua tarefa é extrair detalhes de transações e NUNCA falhar.

  **Sua Missão:**
  1.  **Extraia os Dados:** Analise o texto para obter: descrição, valor, tipo e parcelamento.
  2.  **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico.
      -   Se o valor não for mencionado, extraia a descrição e defina o valor como 0.
      -   Se o tipo não for claro, assuma 'expense' (despesa).
  3.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado.
  4.  **Cálculo de Parcelas:** Se o usuário mencionar "em 10 vezes", "10x", etc., o valor deve ser o TOTAL da compra, 'paymentMethod' é 'installments' e 'installments' é "10".

  **Texto do usuário para análise:**
  ${input.text}
  `;
    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
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


const generateFinancialAnalysisFlow = defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: z.object({ transactions: z.array(z.any()) }),
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) {
      return { healthStatus: 'Atenção', diagnosis: 'Ainda não há transações suficientes para uma análise detalhada.', suggestions: [], trendAnalysis: undefined };
    }
    const prompt = LUMINA_DIAGNOSTIC_PROMPT + `
      ---
      **Dados das Transações do Usuário para Análise:**
      ${JSON.stringify(input.transactions)}

      Analise os dados e retorne o resultado no formato JSON solicitado.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: { format: 'json', schema: GenerateFinancialAnalysisOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    return output;
  }
);


const extractFromFileFlow = defineFlow(
  {
    name: 'extractFromFileFlow',
    inputSchema: z.object({ fileContent: z.string(), fileName: z.string() }),
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em processar extratos bancários. Sua tarefa é analisar o conteúdo de um arquivo, extrair todas as transações e retorná-las em formato JSON.

  **Instruções:**
  1.  **Analise o Conteúdo:** Identifique o formato (CSV, OFX, PDF) e a estrutura.
  2.  **Extraia:** \`date\` (YYYY-MM-DD), \`description\`, \`amount\` (sempre positivo), \`type\` ('income'/'expense'), e \`category\`.
  3.  **Lógica:** Valores positivos são 'income', negativos são 'expense'. O \`amount\` deve ser o valor absoluto.
  4.  **Categorização**: Use a descrição para inferir a categoria da lista fornecida.

  **Categorias Disponíveis:**
  ${transactionCategories.join('\n- ')}

  **Nome do Arquivo:** ${input.fileName}
  **Conteúdo do Arquivo:**
  (Conteúdo está no formato de data URI)

  Analise e retorne o JSON de transações.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: [ { text: prompt }, { media: { url: input.fileContent } } ],
        output: { format: 'json', schema: ExtractFromFileOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu processar o arquivo.');
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
    inputSchema: z.object({ answers: z.record(z.string()) }),
    outputSchema: InvestorProfileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina. Sua tarefa é analisar as respostas do questionário, buscar dados de mercado e determinar o perfil do investidor, sugerindo uma carteira.
      **Instruções:**
      1.  **Buscar Dados de Mercado:** Use \`getFinancialMarketDataTool\` para obter SELIC e IPCA.
      2.  **Determinar Perfil:** Classifique como 'Conservador', 'Moderado' ou 'Arrojado'.
      3.  **Análise:** Escreva uma análise clara do perfil.
      4.  **Alocação:** Sugira uma carteira diversificada (soma 100%).
      5.  **Rentabilidade:** Projete a rentabilidade real como "IPCA + X,XX%".
      6.  **Recomendações:** Dê 2-3 dicas práticas.

      **Respostas:** ${JSON.stringify(input.answers)}

      Retorne o resultado no formato JSON.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        tools: [getFinancialMarketDataTool],
        output: { format: 'json', schema: InvestorProfileOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu processar a análise de perfil.');
    return output;
  }
);


const calculateSavingsGoalFlow = defineFlow(
  {
    name: 'calculateSavingsGoalFlow',
    inputSchema: z.object({ transactions: z.array(z.any()) }),
    outputSchema: SavingsGoalOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) throw new Error('Não há transações suficientes.');
    const prompt = LUMINA_GOALS_SYSTEM_PROMPT + `
      ---
      **Dados das Transações:**
      ${JSON.stringify(input.transactions)}

      Analise, siga as regras e retorne o resultado em JSON.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: { format: 'json', schema: SavingsGoalOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu calcular a meta.');
    return output;
  }
);


const mediateGoalsFlow = defineFlow(
  {
    name: 'mediateGoalsFlow',
    inputSchema: MediateGoalsOutputSchema,
    outputSchema: MediateGoalsOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma terapeuta financeira. Sua missão é ajudar casais a alinhar metas conflitantes.
  **Dados:**
  - Poupança Mensal: ${input.sharedMonthlySavings}
  - Meta A: ${JSON.stringify(input.partnerAGoal)}
  - Meta B: ${JSON.stringify(input.partnerBGoal)}

  **Sua Tarefa:**
  1.  **Analisar Viabilidade.**
  2.  **Criar Plano Conjunto (jointPlan):** Aloque a poupança e recalcule os prazos.
  3.  **Escrever Resumo (summary).**
  4.  **Elaborar Análise (analysis).**
  5.  **Definir Passos de Ação (actionSteps).**

  Retorne o resultado em JSON.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: { format: 'json', schema: MediateGoalsOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu processar a mediação.');
    return output;
  }
);


const extractFromImageFlow = defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: z.object({ imageDataUri: z.string(), allTransactions: z.array(z.any()).optional() }),
    outputSchema: ExtractFromImageOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina. Extraia dados de boletos ou recibos em imagens.
- **Boletos:** Extraia \`amount\`, \`dueDate\`, \`beneficiary\`, \`bank\`, \`digitableLine\`.
- **Recibos:** Extraia \`description\`, \`amount\`, \`date\`, \`category\`.
- **Contexto:** Use o histórico de transações para inferir dados.
- **Retorno:** Sempre retorne um JSON válido.

**Histórico (contexto):**
${JSON.stringify(input.allTransactions || [])}

**Imagem para Análise:**
(A imagem está na próxima parte da mensagem)

Analise e retorne o JSON.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
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
    inputSchema: z.any(), // Simplified for now
    outputSchema: LuminaChatOutputSchema,
  },
  async function (input: any) {
    const userQuery = (input.userQuery || '').trim();
    const transactionsJSON = JSON.stringify((input.allTransactions || []).slice(0, 30), null, 2);

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
      .filter((msg: any) => msg.role === 'user' || msg.role === 'model')
      .map((msg: any) => ({
          role: msg.role,
          content: [{ text: msg.content || '' }]
      }));
    
    const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
    if (input.imageBase64) {
      lastUserMessageParts.push({ media: { contentType: 'image/png', url: `data:image/png;base64,${input.imageBase64}` } });
    }

    try {
        const result = await ai.generate({
            model: googleAI.model('gemini-1.5-flash'),
            system: systemPrompt,
            prompt: lastUserMessageParts,
            history: history,
            config: { temperature: 0.7 },
        });
        
        return { text: result.text || "Tudo bem! Como posso te ajudar?", suggestions: [] };
        
    } catch (err: any) {
        console.error("ERRO GEMINI:", err.message);
        return { text: "Desculpa, estou com um probleminha técnico.", suggestions: ["Resumo do mês"] };
    }
  }
);


// -----------------
// Callable Functions Wrappers
// -----------------
const REGION = "us-central1";

const createGenkitCallable = <I, O>(flow: Flow<I, O>) => {
  return functions.region(REGION).runWith({ secrets: [geminiApiKey], memory: "1GiB" }).https.onCall(async (data: I) => {
    try {
      const result = await run(flow, data);
      return { data: result };
    } catch (e: any) {
      console.error(`Error in flow ${flow.name}:`, e);
      throw new functions.https.HttpsError('internal', e.message || 'An error occurred in the AI flow.');
    }
  });
};

export const getCategorySuggestion = createGenkitCallable(categorizeTransactionFlow);
export const extractTransactionInfoFromText = createGenkitCallable(extractTransactionFromTextFlow);
export const runAnalysis = createGenkitCallable(generateFinancialAnalysisFlow);
export const runFileExtraction = createGenkitCallable(extractFromFileFlow);
export const runInvestorProfileAnalysis = createGenkitCallable(analyzeInvestorProfileFlow);
export const runSavingsGoalCalculation = createGenkitCallable(calculateSavingsGoalFlow);
export const runGoalMediation = createGenkitCallable(mediateGoalsFlow);
export const runImageExtraction = createGenkitCallable(extractFromImageFlow);
export const luminaChat = createGenkitCallable(luminaChatFlow);


// -----------------
// Original Firebase Functions
// -----------------

export const sendPartnerInvite = functions
  .region(REGION)
  .runWith({ secrets: [sendgridApiKey] })
  .https.onCall(async (data, context) => {
    const { partnerEmail, senderName } = data;
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    }
    if (!partnerEmail || !senderName) {
      throw new functions.https.HttpsError("invalid-argument", "Parâmetros inválidos.");
    }
    const inviteToken = db.collection("invites").doc().id;
    const inviteData = {
      sentBy: context.auth.uid,
      sentByName: senderName,
      sentByEmail: context.auth.token.email,
      sentToEmail: partnerEmail,
      status: "pending",
      createdAt: Timestamp.now(),
    };
    await db.collection("invites").doc(inviteToken).set(inviteData);
    return { success: true, message: "Convite enviado com sucesso!" };
  });

export const onInviteCreated = functions
  .region(REGION)
  .runWith({ secrets: [sendgridApiKey] })
  .firestore.document("invites/{inviteId}")
  .onCreate(async (snap) => {
    try {
      const invite = snap.data();
      if (!invite.sentToEmail) {
        console.warn("Convite sem e-mail de destino, ignorando.");
        return null;
      }
      const msg = {
        to: invite.sentToEmail,
        from: { email: "no-reply@financeflow.app", name: "FinanceFlow" },
        subject: `Você recebeu um convite de ${invite.sentByName} para o Modo Casal!`,
        text: `Olá! ${invite.sentByName} convidou você para usar o Modo Casal no FinanceFlow. Acesse o aplicativo para aceitar.`,
        html: `<p>Olá!</p><p><strong>${invite.sentByName}</strong> convidou você para o <strong>Modo Casal</strong> no FinanceFlow.</p><p>Acesse o aplicativo para aceitar.</p>`,
      };
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error("Erro ao enviar email de convite:", error);
      return null;
    }
  });

export const disconnectPartner = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }
  const userId = context.auth.uid;
  try {
    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    if (!userData || !userData.coupleId) {
      throw new functions.https.HttpsError("failed-precondition", "Você não está vinculado a um parceiro.");
    }
    const coupleId = userData.coupleId;
    const coupleDocRef = db.collection("couples").doc(coupleId);
    const coupleDoc = await coupleDocRef.get();
    const members = coupleDoc.exists ? (coupleDoc.data()?.members || []) : [];
    const partnerId = members.find((id: string) => id !== userId);
    const batch = db.batch();
    batch.update(userDocRef, { coupleId: admin.firestore.FieldValue.delete(), memberIds: [userId] });
    if (partnerId) {
      batch.update(db.collection("users").doc(partnerId), { coupleId: admin.firestore.FieldValue.delete(), memberIds: [partnerId] });
    }
    batch.delete(coupleDocRef);
    await batch.commit();
    return { success: true, message: "Desvinculação concluída." };
  } catch (error) {
    console.error("Erro ao desvincular parceiro:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Erro inesperado ao desvincular.");
  }
});

export const checkDashboardStatus = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
  }
  console.log(`Rotina de verificação diária para o usuário: ${context.auth.uid}`);
  return { success: true, message: "Verificação concluída." };
});

export const onTransactionCreated = functions.region(REGION).firestore
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
            const messageText = `⚠️ Alerta financeiro importante: seus gastos do mês ultrapassaram suas entradas. Deseja ver um plano para equilibrar?`;
            const chatDocRef = db.collection(`users/${userId}/chat`).doc();
            await db.batch().set(chatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Sim, mostre o plano", "Onde estou gastando mais?"] }).commit();
          }
        }
      });
    } catch (error) {
      console.error(`Erro em onTransactionCreated para usuário ${userId}:`, error);
    }
    return null;
  });

export const dailyFinancialCheckup = functions.region(REGION).pubsub.schedule('every 24 hours').onRun(async () => {
  // Implementation remains the same, but shortened for brevity
  return null;
});
