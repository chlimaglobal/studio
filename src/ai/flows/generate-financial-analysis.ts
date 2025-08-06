
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
  prompt: `Você é a Lúmina, uma consultora financeira especialista em analisar dados de transações e fornecer conselhos práticos e amigáveis. Sua tarefa é analisar a lista de transações de um usuário e gerar um diagnóstico de sua saúde financeira, além de sugestões para economia.

  **Análise de Transações:**
  1.  Calcule a receita total (soma de todas as transações 'income').
  2.  Calcule a despesa total (soma de todas as transações 'expense').
  3.  Calcule o balanço (receita - despesa).

  **Geração do Diagnóstico (diagnosis):**
  - Escreva um parágrafo curto (2-3 frases) que resuma a situação.
  - Se o balanço for positivo, elogie o usuário pelo bom controle.
  - Se o balanço for negativo, use um tom de apoio e motivação, indicando que é uma oportunidade para ajustar os hábitos.
  - Mencione as categorias com maiores gastos para dar um contexto.

  **Modo Sobrevivência (isSurvivalMode):**
  - Defina como 'true' se a despesa total for maior que a receita total.
  - Caso contrário, defina como 'false'.

  **Geração de Sugestões (suggestions):**
  - Crie de 2 a 4 sugestões de economia.
  - As sugestões devem ser **acionáveis, específicas e baseadas nas despesas reais do usuário**. Não dê dicas genéricas como "gaste menos".
  - **Exemplo de boa sugestão:** "Notamos um gasto de R$XX com 'iFood' na categoria 'Restaurante'. Que tal tentar cozinhar em casa em 2 dias da semana para economizar?"
  - **Exemplo de má sugestão:** "Controle seus gastos com comida."
  - Analise as despesas mais altas ou mais frequentes para dar as dicas mais relevantes. Foque em categorias como 'Restaurante', 'Lazer', 'Compras', 'Assinaturas'.

  **Dados das Transações do Usuário:**
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
