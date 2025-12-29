
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import * as sgMail from "@sendgrid/mail";
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import { defineSecret } from "firebase-functions/params";

// Genkit Imports
import { genkit, Flow, run, defineFlow, ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { z } from 'zod';

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
    LuminaChatOutputSchema
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

// Initialize Genkit globally
genkit({
  plugins: [
    firebase(),
    googleAI({ apiKey: geminiApiKey.value() }),
  ],
  enableTracingAndMetrics: true,
});

sgMail.setApiKey(sendgridApiKey.value());


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
    const prompt = `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"
- "Cinema ingresso" -> "Cinema"
- "iFood" -> "Delivery"

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

Analise a descrição a seguir e retorne **apenas uma** categoria da lista.

**Descrição da Transação:** ${input.description}`;
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash',
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
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma assistente financeira especialista em interpretar texto. Sua tarefa é extrair detalhes de transações e NUNCA falhar.

  **Sua Missão:**
  1.  **Extraia os Dados:** Analise o texto para obter: descrição, valor, tipo e parcelamento.
  2.  **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico.
      -   Se o valor não for mencionado, extraia a descrição e defina o valor como 0.
      -   Se o tipo não for claro, assuma 'expense' (despesa).
  3.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado, mesmo que alguns campos sejam preenchidos com valores padrão.
  4.  **Cálculo de Parcelas:** Se o usuário mencionar "em 10 vezes", "10x", etc., o valor deve ser o TOTAL da compra, 'paymentMethod' é 'installments' e 'installments' é "10".

  **Texto do usuário para análise:**
  ${input.text}`;
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

const generateFinancialAnalysisFlow = defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
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
        model: 'gemini-1.5-flash',
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
    inputSchema: ExtractFromFileInputSchema,
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, especialista em processar extratos (CSV, OFX, PDF). Extraia todas as transações financeiras, retornando um JSON com a chave \`transactions\`.

  **Instruções:**
  1.  Para cada transação, extraia: \`date\` (YYYY-MM-DD), \`description\`, \`amount\` (positivo), \`type\` ('income' ou 'expense'), e \`category\`.
  2.  Valores positivos são 'income', negativos são 'expense'. \`amount\` é o valor absoluto.
  3.  Categorize com base na lista: ${transactionCategories.join(', ')}.

  **Conteúdo do Arquivo (${input.fileName}):**`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
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
    inputSchema: InvestorProfileInputSchema,
    outputSchema: InvestorProfileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é Lúmina. Analise o perfil de investidor.

      **Instruções:**
      1.  Use a ferramenta \`getFinancialMarketDataTool\` para obter SELIC e IPCA.
      2.  Classifique o perfil como 'Conservador', 'Moderado' ou 'Arrojado'.
      3.  Escreva a análise, sugira alocação de ativos (soma 100), projete rentabilidade real ("IPCA + X,XX%") e dê recomendações.

      **Respostas do Usuário:**
      ${JSON.stringify(input.answers)}

      Retorne o resultado no formato JSON.`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
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
    inputSchema: SavingsGoalInputSchema,
    outputSchema: SavingsGoalOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) throw new Error('Não há transações suficientes para calcular uma meta.');
    const prompt = LUMINA_GOALS_SYSTEM_PROMPT + `
      ---
      **Dados das Transações do Usuário para Análise:**
      ${JSON.stringify(input.transactions)}

      Analise os dados, siga as regras e retorne o resultado no formato JSON.`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: SavingsGoalOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu calcular a meta de economia.');
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
    const prompt = `Você é a Lúmina. Sua missão é ajudar casais a alinhar metas financeiras.

  **Contexto:**
  - Poupança Mensal Conjunta: ${input.sharedMonthlySavings}
  - Meta A: ${JSON.stringify(input.partnerAGoal)}
  - Meta B: ${JSON.stringify(input.partnerBGoal)}

  **Sua Tarefa:**
  1.  Crie um \`jointPlan\` alocando a poupança e recalculando os prazos.
  2.  Escreva um \`summary\`, uma \`analysis\` e defina \`actionSteps\`.

  Retorne o resultado no formato JSON especificado.`;
    const result = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: prompt,
        output: { format: 'json', schema: MediateGoalsOutputSchema }
    });
    const output = result.output;
    if (!output) throw new Error('A Lúmina não conseguiu processar a mediação de metas.');
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
    const prompt = `Você é Lúmina, especialista em extrair dados de imagens financeiras.

**Sua Missão Final:**
1.  Identifique se a imagem é um Boleto ou Recibo/Nota.
2.  Extraia os campos relevantes para o tipo identificado.
3.  Retorne um JSON Válido, seguindo o schema.

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

**Imagem para Análise:**`;
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
    const userQuery = (input.userQuery || '').trim();
    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);

    const systemPrompt = `${LUMINA_BASE_PROMPT}
Contexto: Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}. Transações: ${transactionsJSON}`;

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
        return {
            text: "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido?",
            suggestions: ["Resumo do mês", "Maiores gastos"],
        };
    }
  }
);


// -----------------
// Callable Functions Wrapper
// -----------------
const REGION = "us-central1";

const createGenkitCallable = <I, O>(flow: Flow<I, O>) => {
  return functions.region(REGION).runWith({ secrets: [geminiApiKey, sendgridApiKey], memory: "1GiB" }).https.onCall(async (data: I, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
    }
    
    const isPremium = async () => {
        if (context.auth?.token.email === 'digitalacademyoficiall@gmail.com') return true;
        const userDoc = await db.collection('users').doc(context.auth!.uid).get();
        const subStatus = userDoc.data()?.stripeSubscriptionStatus;
        return subStatus === 'active' || subStatus === 'trialing';
    };

    const premiumFlows = new Set([
      'generateFinancialAnalysisFlow', 'extractFromFileFlow', 'analyzeInvestorProfileFlow', 
      'calculateSavingsGoalFlow', 'mediateGoalsFlow', 'extractFromImageFlow', 'luminaChatFlow'
    ]);

    if (premiumFlows.has(flow.name) && !(await isPremium())) {
        throw new functions.https.HttpsError('permission-denied', 'Assinatura Premium necessária para este recurso.');
    }
    
    try {
      return await run(flow, data);
    } catch (e: any) {
      console.error(`Error in flow ${flow.name}:`, e);
      throw new functions.https.HttpsError('internal', e.message || 'An error occurred while executing the AI flow.');
    }
  });
};

// Export Callable Functions
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
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    const { partnerEmail, senderName } = data;
    const inviteToken = db.collection("invites").doc().id;
    await db.collection("invites").doc(inviteToken).set({
      sentBy: context.auth.uid,
      sentByName: senderName,
      sentByEmail: context.auth.token.email || null,
      sentToEmail: partnerEmail,
      status: "pending",
      createdAt: Timestamp.now(),
    });
    return { success: true, message: "Convite enviado com sucesso!" };
  });

export const onInviteCreated = functions
  .region(REGION)
  .runWith({ secrets: [sendgridApiKey] })
  .firestore.document("invites/{inviteId}")
  .onCreate(async (snap) => {
    const invite = snap.data();
    if (!invite.sentToEmail) return null;
    
    const msg = {
      to: invite.sentToEmail,
      from: { email: "no-reply@financeflow.app", name: "FinanceFlow" },
      subject: `Você recebeu um convite de ${invite.sentByName} para o Modo Casal!`,
      html: `<p>Olá!</p><p><strong>${invite.sentByName}</strong> convidou você para o Modo Casal no FinanceFlow.</p><p>Acesse o aplicativo para aceitar.</p>`,
    };

    await sgMail.send(msg);
    return { success: true };
  });

export const disconnectPartner = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    const userDocRef = db.collection("users").doc(context.auth.uid);
    const userDoc = await userDocRef.get();
    const coupleId = userDoc.data()?.coupleId;
    if (!coupleId) throw new functions.https.HttpsError("failed-precondition", "Você não está vinculado.");
    
    const coupleDocRef = db.collection("couples").doc(coupleId);
    const coupleDoc = await coupleDocRef.get();
    const members = coupleDoc.data()?.members || [];
    const partnerId = members.find((id: string) => id !== context.auth.uid);

    const batch = db.batch();
    batch.update(userDocRef, { coupleId: admin.firestore.FieldValue.delete(), memberIds: [context.auth.uid] });
    if (partnerId) batch.update(db.collection("users").doc(partnerId), { coupleId: admin.firestore.FieldValue.delete(), memberIds: [partnerId] });
    batch.delete(coupleDocRef);
    await batch.commit();

    return { success: true, message: "Desvinculação concluída." };
  });


export { alexaWebhook } from './alexa';
