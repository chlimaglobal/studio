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
    LuminaChatOutputSchema,
    LuminaCoupleChatInputSchema
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
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"
- "Almoço com amigos" -> "Restaurante"
- "Cinema ingresso" -> "Cinema"
- "iFood" -> "Delivery"
- "Conta de luz" -> "Luz"
- "Mensalidade da academia" -> "Assinaturas/Serviços"
- "Compra no mercado" -> "Supermercado"
- "Uber" -> "Táxi/Uber"
- "Netflix" -> "Streamings"
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

  **Exemplos:**
  - **Texto:** "gastei 25 reais no almoço" -> **Saída:** { "description": "Almoço", "amount": 25, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" }
  - **Texto:** "paguei o spotify" -> **Saída:** { "description": "Spotify", "amount": 0, "type": "expense", "category": "Streamings", "paymentMethod": "one-time" }
  - **Texto:** "Comprei um celular novo por 3 mil reais em 10 vezes" -> **Saída:** { "description": "Celular novo", "amount": 3000, "type": "expense", "category": "Compras", "paymentMethod": "installments", "installments": "10" }

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
    inputSchema: ExtractFromFileInputSchema,
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em processar extratos bancários de diversos formatos (CSV, OFX, PDF). Sua tarefa é analisar o conteúdo de um arquivo, extrair todas as transações financeiras e retorná-las em um formato JSON estruturado.

  **Instruções de Processamento:**
  1.  **Analise o Conteúdo:** O conteúdo do arquivo será fornecido como uma string. Identifique o formato e a estrutura.
  2.  **Extraia os Campos:** Para cada transação, extraia: \`date\` (YYYY-MM-DD), \`description\`, \`amount\` (sempre positivo), \`type\` ('income' ou 'expense'), e \`category\`.
  3.  **Lógica de Tipos:** Valores positivos são 'income', negativos são 'expense'. O \`amount\` no JSON de saída deve ser o valor absoluto.
  4.  **Categorização**: Use a descrição para inferir a categoria mais provável da lista fornecida.
  5.  **Retorno:** Retorne um objeto JSON com a chave \`transactions\`, que é um array de objetos de transação.

  **Categorias Disponíveis para \`category\`:**
  ${transactionCategories.join('\n- ')}

  **Nome do Arquivo (para contexto):** ${input.fileName}
  **Conteúdo do Arquivo para Análise:**
  (O conteúdo está no formato de data URI na próxima parte da mensagem)

  Analise o conteúdo e retorne a lista de transações no formato JSON especificado.`;
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
    inputSchema: InvestorProfileInputSchema,
    outputSchema: InvestorProfileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma planejadora financeira especialista em análise de perfil de investidor (suitability). Sua tarefa é analisar as respostas de um questionário, buscar dados atuais do mercado financeiro e, com base em tudo isso, determinar o perfil de risco do investidor, fornecer uma análise detalhada, sugerir uma alocação de carteira e projetar uma rentabilidade real.

      **Contexto das Perguntas e Respostas:**
      - **q1 (Objetivo):** a1 (Preservar) -> a4 (Maximizar ganhos)
      - **q2 (Horizonte de Tempo):** b1 (Curto prazo) -> b4 (Longo prazo)
      - **q3 (Reação à Volatilidade):** c1 (Vende tudo) -> c4 (Compra mais)

      **Instruções de Análise:**
      1.  **Buscar Dados de Mercado:** Use a ferramenta \`getFinancialMarketDataTool\` para obter as taxas SELIC e IPCA atuais.
      2.  **Determinar o Perfil:** Com base nas respostas, classifique o perfil como 'Conservador', 'Moderado' ou 'Arrojado'.
      3.  **Escrever a Análise (analysis):** Elabore um texto claro e didático.
      4.  **Sugerir Alocação de Ativos (assetAllocation):** Crie uma carteira diversificada. A soma deve ser 100.
      5.  **Projetar Rentabilidade Real (expectedReturn):** Calcule e retorne a rentabilidade anual estimada da carteira acima da inflação no formato "IPCA + X,XX%".
      6.  **Fornecer Recomendações (recommendations):** Dê 2 ou 3 dicas práticas.

      **Respostas do Usuário para Análise:**
      ${JSON.stringify(input.answers)}

      Analise os dados e retorne o resultado no formato JSON solicitado.`;
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
        model: googleAI.model('gemini-1.5-flash'),
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
    const prompt = `Você é a Lúmina, uma terapeuta e planejadora financeira especialista em casais. Sua missão é ajudar casais a alinhar suas metas financeiras, mesmo quando parecem conflitantes.

  **Contexto:**
  - Renda e Despesas: Parceiro A (Renda: ${input.partnerAIncome}, Despesas: ${input.partnerAExpenses}), Parceiro B (Renda: ${input.partnerBIncome}, Despesas: ${input.partnerBExpenses})
  - Poupança Atual: ${input.currentSavings}
  - Capacidade de Economia Mensal: ${input.sharedMonthlySavings}
  - Meta A: ${JSON.stringify(input.partnerAGoal)}
  - Meta B: ${JSON.stringify(input.partnerBGoal)}

  **Sua Tarefa:**
  1.  **Analisar a Viabilidade:** Verifique se a soma dos aportes necessários para cada meta ultrapassa a capacidade de economia do casal.
  2.  **Criar um Plano Conjunto (jointPlan):** Aloque a poupança mensal proporcionalmente e recalcule os prazos (\`newMonths\`).
  3.  **Escrever um Resumo (summary):** Crie um parágrafo curto e positivo.
  4.  **Elaborar a Análise (analysis):** Explique seu raciocínio de forma clara.
  5.  **Definir Passos de Ação (actionSteps):** Forneça 2 ou 3 passos práticos.

  Analise os dados e retorne o resultado no formato JSON especificado.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
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
    const prompt = `Você é Lúmina, uma assistente financeira especialista em interpretar imagens financeiras. Sua missão é extrair, interpretar, e transformar imagens em dados estruturados.

### MÓDULO 1: RECONHECIMENTO DE BOLETOS
- **Campos:** \`amount\`, \`dueDate\` (YYYY-MM-DD), \`beneficiary\`, \`bank\`, \`digitableLine\`.
- **Valores Fixos:** \`type\`: "expense", \`category\`: "Contas", \`paymentMethod\`: "one-time", \`description\`: "Pagamento de Boleto: [Beneficiário]".

### MÓDULO 2: EXTRAÇÃO DE RECIBOS E NOTAS
- **Campos:** \`description\`, \`amount\` (TOTAL), \`date\` (YYYY-MM-DD), \`type\`: 'expense', \`category\`, \`cnpj\`, \`items\` (lista com 'name', 'quantity', 'price').
- **Cálculo de Parcelas:** Se "10x de R$27,17", o valor é 271.70, 'paymentMethod' é 'installments' e 'installments' é "10".

**Sua Missão Final:**
1.  **Identifique o Tipo de Imagem:** Boleto ou Recibo.
2.  **Aplique o Módulo Correto.**
3.  **Retorne um JSON Válido.**

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

---
**DADOS PARA ANÁLISE:**
**Histórico de Transações (contexto):**
${JSON.stringify(input.allTransactions || [])}

**Imagem para Análise:**
(A imagem está na próxima parte da mensagem)

Analise a imagem e retorne um JSON válido.`;
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
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async function (input) {
    const userId = input.user?.uid || 'default';
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
            model: googleAI.model('gemini-1.5-flash'),
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
// Callable Functions for Genkit Flows
// -----------------
const REGION = "us-central1";

const createGenkitCallable = <I, O>(flow: Flow<I, O>) => {
  return functions.region(REGION).runWith({ secrets: [geminiApiKey], memory: "1GiB" }).https.onCall(async (data: I) => {
    try {
      const result = await run(flow, data);
      return { data: result };
    } catch (e: any) {
      console.error(`Error in flow ${flow.name}:`, e);
      throw new functions.https.HttpsError('internal', e.message || 'An error occurred while executing the AI flow.');
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
    try {
      const { partnerEmail, senderName } = data;
      if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
      if (!partnerEmail || !senderName) throw new functions.https.HttpsError("invalid-argument", "Parâmetros inválidos ao enviar convite.");
      
      const inviteToken = db.collection("invites").doc().id;
      const inviteData = {
        sentBy: context.auth.uid,
        sentByName: senderName,
        sentByEmail: context.auth.token.email || null,
        sentToEmail: partnerEmail,
        status: "pending",
        createdAt: Timestamp.now(),
      };
      await db.collection("invites").doc(inviteToken).set(inviteData);
      return { success: true, inviteToken, message: "Convite criado com sucesso!" };
    } catch (error) {
      console.error("Erro em sendPartnerInvite:", error);
      throw new functions.https.HttpsError("internal", "Erro ao enviar convite.");
    }
  });

export const onInviteCreated = functions
  .region(REGION)
  .runWith({ secrets: [sendgridApiKey] })
  .firestore.document("invites/{inviteId}")
  .onCreate(async (snap) => {
    try {
      const invite = snap.data() as DocumentData;
      if (!invite.sentToEmail) {
        console.warn("Convite sem e-mail de destino, ignorando.");
        return;
      }
      const msg = {
        to: invite.sentToEmail,
        from: { email: "no-reply@financeflow.app", name: "FinanceFlow" },
        subject: "Você recebeu um convite para o Modo Casal 💙",
        text: `Olá!\n\n${invite.sentByName} convidou você para vincular contas no FinanceFlow.\nAcesse o app para aceitar o convite.`,
        html: `<p>Olá!</p><p><strong>${invite.sentByName}</strong> convidou você para usar o <strong>Modo Casal</strong> no FinanceFlow.</p><p>Acesse o aplicativo para visualizar e aceitar o convite.</p>`,
      };
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error("Erro ao enviar email de convite:", error);
      throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail.");
    }
  });

export const disconnectPartner = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    const userId = context.auth.uid;
    try {
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      const userData = userDoc.data();
      if (!userData || !userData.coupleId) throw new functions.https.HttpsError("failed-precondition", "Você não está vinculado a um parceiro.");
      
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
      return { success: true, message: "Desvinculação concluída." };
    } catch (error) {
      console.error("Erro ao desvincular parceiro:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", "Erro inesperado ao desvincular.");
    }
  });

export const checkDashboardStatus = functions.region(REGION).https.onCall(
  async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    console.log(`Rotina de verificação diária para o usuário: ${context.auth.uid}`);
    return { success: true, message: "Verificação concluída." };
  }
);

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

export const dailyFinancialCheckup = functions.region(REGION).pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    let lastVisible = null as functions.firestore.QueryDocumentSnapshot | null;
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
          try {
            if (userData.isDependent) return;
            const now = new Date();
            const currentMonthKey = format(now, "yyyy-MM");
            let updates: { [key: string]: any } = {};
            const chatBatch = db.batch();
            let chatMessagesCount = 0;
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
                  const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                  chatBatch.set(newChatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Sim, detalhe", "Foi um gasto pontual", "Ok, obrigado"] });
                  chatMessagesCount++;
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
                const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                chatBatch.set(newChatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Ver transações", "Definir orçamento", "Entendido"] });
                chatMessagesCount++;
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
                  const newChatDocRef = db.collection(`users/${userId}/chat`).doc();
                  chatBatch.set(newChatDocRef, { role: "alerta", text: messageText, authorName: "Lúmina", timestamp: admin.firestore.FieldValue.serverTimestamp(), suggestions: ["Me ajude a cortar gastos", "O que aconteceu?", "Ok"] });
                  chatMessagesCount++;
                } else {
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
            if (chatMessagesCount > 0) await chatBatch.commit();
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
