
'use server';

/**
 * @fileOverview An AI agent to analyze financial transactions and provide insights.
 *
 * - generateFinancialAnalysis - A function that generates a financial health diagnosis.
 * - GenerateFinancialAnalysisInput - The input type for the function.
 * - GenerateFinancialAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { Transaction } from '@/lib/types';
import { z } from 'genkit';
import { endOfISOWeek } from 'date-fns';

const GenerateFinancialAnalysisInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas).'),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

const TrendAnalysisSchema = z.object({
  trendDescription: z.string().describe('Uma descrição textual da tendência de gastos do mês atual em comparação com a média dos últimos 3 meses.'),
  topChangingCategories: z.array(z.object({
    category: z.string().describe('A categoria de despesa.'),
    changePercentage: z.number().describe('A mudança percentual no gasto em comparação com a média.'),
    currentMonthSpending: z.number().describe('O gasto total na categoria no mês atual.'),
  })).describe('Uma lista das 3 categorias com as maiores mudanças percentuais (positivas ou negativas).')
}).optional();


const GenerateFinancialAnalysisOutputSchema = z.object({
  healthStatus: z.enum(['Saudável', 'Atenção', 'Crítico']).describe('A pontuação geral da saúde financeira do usuário.'),
  diagnosis: z.string().describe('Um diagnóstico textual curto e amigável sobre a saúde financeira do usuário, explicando o status.'),
  suggestions: z.array(z.string()).describe('Uma lista de 2 a 4 dicas de economia acionáveis e personalizadas com base nos gastos.'),
  trendAnalysis: TrendAnalysisSchema.describe('Uma análise das tendências de gastos do usuário ao longo do tempo.'),
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;

export async function generateFinancialAnalysis(input: { transactions: Transaction[] }): Promise<GenerateFinancialAnalysisOutput> {
  const simplifiedTransactions = input.transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date, // Include date for trend analysis
  }));

  // @ts-ignore
  return generateFinancialAnalysisFlow({ transactions: simplifiedTransactions });
}

const prompt = ai.definePrompt({
  name: 'generateFinancialAnalysisPrompt',
  input: { schema: GenerateFinancialAnalysisInputSchema },
  output: { schema: GenerateFinancialAnalysisOutputSchema },
  model: 'googleai/gemini-1.5-pro-latest',
  prompt: `Você é a Lúmina, uma planejadora financeira especialista em analisar dados de transações e fornecer conselhos práticos, amigáveis e personalizados. Sua tarefa é dupla:
  1. Gerar um diagnóstico completo da saúde financeira, incluindo um 'Status de Saúde Financeira'.
  2. Analisar as tendências de gastos de longo prazo.

  **Sua Personalidade:**
  - **Empática e Direta:** Fale diretamente com o usuário. Use um tom de apoio, mas seja clara sobre os pontos que precisam de atenção.
  - **Focada em Soluções:** Em vez de apenas apontar problemas, sempre ofereça um caminho ou uma solução prática.

  ---
  **Parte 1: Diagnóstico da Saúde Financeira Atual**
  Analise as transações do último mês.

  **1. Análise de Transações:**
  - Calcule a receita total (soma de todas as transações 'income').
  - Calcule a despesa total (soma de todas as transações 'expense').
  - Calcule o balanço (receita - despesa).
  - Identifique as 3 categorias com maiores gastos.

  **2. Determinação do Status de Saúde Financeira (healthStatus):**
  - Com base na análise, classifique a saúde financeira como 'Saudável', 'Atenção' ou 'Crítico'.
  - **'Saudável':** O balanço é significativamente positivo. Os gastos estão controlados e alinhados com a renda.
  - **'Atenção':** O balanço é próximo de zero ou ligeiramente negativo. Existem alguns pontos de descontrole que precisam ser observados.
  - **'Crítico':** As despesas são significativamente maiores que as receitas. A situação exige ação imediata.

  **3. Geração do Diagnóstico (diagnosis):**
  - Escreva um parágrafo curto e pessoal (2-3 frases) que resuma a situação financeira, justificando o 'healthStatus'.
  - Se for 'Saudável', elogie. Ex: "Ótimo trabalho! Você fechou o mês no azul e está no controle."
  - Se for 'Atenção', alerte. Ex: "Fique atento. Suas despesas estão muito próximas de suas receitas. Vamos ajustar isso juntos?"
  - Se for 'Crítico', seja direto, mas encorajador. Ex: "Sinal vermelho. Suas despesas superaram suas receitas este mês. É hora de agir, e estou aqui para ajudar."
  - Sempre mencione as categorias com maiores gastos para dar contexto.

  **4. Geração de Sugestões (suggestions):**
  - Crie de 2 a 4 sugestões de economia. Elas DEVEM ser acionáveis, específicas e baseadas nas despesas reais do usuário.
  - **Dê um título à sugestão seguido de dois pontos e a explicação.** Ex: "Atenção aos gastos com Delivery: Notei que seus gastos com iFood e outros serviços de entrega somaram R$XX. Que tal definir uma meta de cozinhar em casa 3 vezes por semana para economizar?"

  ---
  **Parte 2: Análise de Tendências (trendAnalysis)**
  Analise os dados de transações dos últimos 4 meses (o mês atual e os 3 meses anteriores).

  **1. Cálculo de Médias:**
  - Calcule a média de gastos mensais para cada categoria nos 3 meses anteriores ao mês atual.
  - Calcule o gasto total de cada categoria no mês atual.

  **2. Identifique Tendências:**
  - Compare o gasto do mês atual com a média dos 3 meses anteriores para cada categoria.
  - Identifique as 3 categorias com a maior mudança percentual (positiva ou negativa). Ignore categorias com gastos muito baixos (ex: menos de R$50 de média) para evitar distorções.

  **3. Geração da Análise de Tendência (trendAnalysis):**
  - **trendDescription:** Escreva uma frase resumindo a tendência geral. Ex: "Neste mês, seus gastos totais foram 15% maiores que a sua média dos últimos 3 meses." ou "Parabéns! Você reduziu seus gastos em 10% em relação à sua média recente."
  - **topChangingCategories:** Retorne um array com as 3 categorias que mais mudaram. Para cada uma, inclua a categoria, a porcentagem da mudança (ex: 25 para 25% de aumento, -15 para 15% de redução) e o valor gasto no mês atual.

  ---
  **Dados das Transações do Usuário para Análise:**
  {{{json transactions}}}

  Analise os dados e retorne o resultado no formato JSON solicitado, preenchendo todas as partes do schema de saída.`,
});

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 2000,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);
