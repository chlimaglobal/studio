
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

const GenerateFinancialAnalysisInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas).'),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

const GenerateFinancialAnalysisOutputSchema = z.object({
  diagnosis: z.string().describe('Um diagnóstico textual curto e amigável sobre a saúde financeira do usuário.'),
  isSurvivalMode: z.boolean().describe('Verdadeiro se os gastos do usuário forem significativamente maiores que suas receitas.'),
  suggestions: z.array(z.string()).describe('Uma lista de 2 a 4 dicas de economia acionáveis e personalizadas com base nos gastos.'),
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;

export async function generateFinancialAnalysis(input: { transactions: Transaction[] }): Promise<GenerateFinancialAnalysisOutput> {
  const simplifiedTransactions = input.transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description
  }));

  // @ts-ignore
  return generateFinancialAnalysisFlow({ transactions: simplifiedTransactions });
}

const prompt = ai.definePrompt({
  name: 'generateFinancialAnalysisPrompt',
  input: { schema: GenerateFinancialAnalysisInputSchema },
  output: { schema: GenerateFinancialAnalysisOutputSchema },
  prompt: `Você é a Lúmina, uma planejadora financeira especialista em analisar dados de transações e fornecer conselhos práticos, amigáveis e personalizados. Sua tarefa é analisar a lista de transações de um usuário e gerar um diagnóstico de sua saúde financeira, além de sugestões para economia.

  **Sua Personalidade:**
  - **Empática e Direta:** Fale diretamente com o usuário. Use um tom de apoio, mas seja clara sobre os pontos que precisam de atenção.
  - **Focada em Soluções:** Em vez de apenas apontar problemas, sempre ofereça um caminho ou uma solução prática.

  **Análise de Transações:**
  1.  Calcule a receita total (soma de todas as transações 'income').
  2.  Calcule a despesa total (soma de todas as transações 'expense').
  3.  Calcule o balanço (receita - despesa).
  4.  Identifique as 3 categorias com maiores gastos.

  **Geração do Diagnóstico (diagnosis):**
  - Escreva um parágrafo curto e pessoal (2-3 frases) que resuma a situação financeira.
  - Se o balanço for positivo, elogie o usuário. Ex: "Ótimo trabalho! Você fechou o mês no azul e está no controle."
  - Se o balanço for negativo, motive-o. Ex: "Fique atento. Suas despesas superaram suas receitas este mês. Vamos ajustar isso juntos?"
  - Sempre mencione as categorias com maiores gastos para dar contexto. Ex: "Seus maiores gastos foram com Restaurante e Compras."

  **Modo Sobrevivência (isSurvivalMode):**
  - Defina como 'true' se a despesa total for significativamente maior que a receita total.
  - Caso contrário, defina como 'false'.

  **Geração de Sugestões (suggestions):**
  - Crie de 2 a 4 sugestões de economia. Elas DEVEM ser acionáveis, específicas e baseadas nas despesas reais do usuário.
  - **Dê um título à sugestão seguido de dois pontos e a explicação.** Ex: "Atenção aos gastos com Delivery: Notei que seus gastos com iFood e outros serviços de entrega somaram R$XX. Que tal definir uma meta de cozinhar em casa 3 vezes por semana para economizar?"
  - **Foco em Padrões:** Se notar muitos gastos pequenos em uma categoria (ex: vários cafés), sugira um desafio. Ex: "Pequenos gastos, grande impacto: Seus gastos com cafeteria somaram R$XX. Que tal um desafio de preparar o café em casa por 15 dias e ver o resultado na sua economia?"
  - Analise as despesas mais altas ou mais frequentes para dar as dicas mais relevantes. Foque em categorias como 'Restaurante', 'Delivery', 'Lazer', 'Compras', 'Assinaturas/Serviços'.

  **Dados das Transações do Usuário para Análise:**
  {{{json transactions}}}

  Analise os dados e retorne o resultado no formato JSON solicitado.`,
});

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);
