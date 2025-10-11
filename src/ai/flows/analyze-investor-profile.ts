
'use server';

/**
 * @fileOverview Um agente de IA para analisar o perfil de investidor de um usuário ou casal.
 *
 * - analyzeInvestorProfile - Uma função que analisa as respostas do questionário.
 * - InvestorProfileInput - O tipo de entrada para a função.
 * - InvestorProfileOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import {
    InvestorProfileInputSchema,
    InvestorProfileOutputSchema,
    type InvestorProfileInput,
    type InvestorProfileOutput
} from '@/lib/types';
import { getFinancialMarketData, type FinancialData } from '@/services/market-data';
import { z } from 'zod';

const getFinancialMarketDataTool = ai.defineTool(
    {
        name: 'getFinancialMarketData',
        description: 'Obtém dados e taxas atuais do mercado financeiro brasileiro, como SELIC e IPCA.',
        outputSchema: z.object({
            selicRate: z.number(),
            ipcaRate: z.number(),
        }),
    },
    async () => {
        return getFinancialMarketData();
    }
);


export async function analyzeInvestorProfile(input: InvestorProfileInput): Promise<InvestorProfileOutput> {
  return analyzeInvestorProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInvestorProfilePrompt',
  input: { schema: InvestorProfileInputSchema },
  output: { schema: InvestorProfileOutputSchema },
  tools: [getFinancialMarketDataTool],
  model: 'googleai/gemini-1.5-pro',
  prompt: `Você é a Lúmina, uma planejadora financeira especialista em análise de perfil de investidor (suitability). Sua tarefa é analisar as respostas de um questionário, buscar dados atuais do mercado financeiro e, com base em tudo isso, determinar o perfil de risco do investidor, fornecer uma análise detalhada, sugerir uma alocação de carteira e projetar uma rentabilidade real.

  **Contexto das Perguntas e Respostas:**
  - **q1 (Objetivo):** a1 (Preservar) -> a4 (Maximizar ganhos)
  - **q2 (Horizonte de Tempo):** b1 (Curto prazo) -> b4 (Longo prazo)
  - **q3 (Reação à Volatilidade):** c1 (Vende tudo) -> c4 (Compra mais)

  **Instruções de Análise:**
  1.  **Buscar Dados de Mercado:** Use a ferramenta \`getFinancialMarketDataTool\` para obter as taxas SELIC e IPCA atuais.
  2.  **Determinar o Perfil:** Com base nas respostas, classifique o perfil como 'Conservador', 'Moderado' ou 'Arrojado'.
  3.  **Escrever a Análise (analysis):** Elabore um texto claro e didático. Explique o perfil, o que significa a tolerância ao risco do investidor e como isso impacta as escolhas de investimento.
  4.  **Sugerir Alocação de Ativos (assetAllocation):** Crie uma carteira diversificada e adequada ao perfil. A soma das porcentagens deve ser 100. Use classes de ativos como "RF Pós-Fixado", "RF Inflação", "Multimercado", "Ações Brasil", "Ações Globais".
      - **Conservador:** Foco em Renda Fixa (Pós-Fixado, Inflação).
      - **Moderado:** Equilíbrio entre Renda Fixa e uma porção de Renda Variável (Multimercado, Ações).
      - **Arrojado:** Maior parte em Renda Variável.
  5.  **Projetar Rentabilidade Real (expectedReturn):** Com base na alocação sugerida e nos dados de mercado (IPCA), calcule e retorne a rentabilidade anual estimada da carteira acima da inflação. O formato deve ser "IPCA + X,XX%".
      - Para o cálculo, considere as seguintes premissas de retorno real (acima do IPCA) por classe de ativo:
        - RF Pós-Fixado: SELIC - IPCA
        - RF Inflação: 4.5%
        - RF Pré-Fixado: 5.5%
        - Multimercado: 6%
        - Ações Brasil: 8%
        - Ações Globais: 8.5%
      - Calcule a média ponderada desses retornos com base na alocação percentual da carteira.
  6.  **Fornecer Recomendações (recommendations):** Dê 2 ou 3 dicas práticas.

  **Respostas do Usuário para Análise:**
  {{{json answers}}}

  Analise os dados e retorne o resultado no formato JSON solicitado.`,
});


const analyzeInvestorProfileFlow = ai.defineFlow(
  {
    name: 'analyzeInvestorProfileFlow',
    inputSchema: InvestorProfileInputSchema,
    outputSchema: InvestorProfileOutputSchema,
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
      throw new Error('A Lúmina não conseguiu processar a análise de perfil.');
    }
    return output;
  }
);
