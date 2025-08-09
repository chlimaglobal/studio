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


export async function analyzeInvestorProfile(input: InvestorProfileInput): Promise<InvestorProfileOutput> {
  return analyzeInvestorProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInvestorProfilePrompt',
  input: { schema: InvestorProfileInputSchema },
  output: { schema: InvestorProfileOutputSchema },
  prompt: `Você é a Lúmina, uma planejadora financeira especialista em análise de perfil de investidor (suitability). Sua tarefa é analisar as respostas de um questionário e determinar o perfil de risco do investidor, fornecer uma análise detalhada e sugerir uma alocação de carteira.

  **Contexto das Perguntas e Respostas:**
  - **q1 (Objetivo):** a1 (Preservar) -> a4 (Maximizar ganhos)
  - **q2 (Horizonte de Tempo):** b1 (Curto prazo) -> b4 (Longo prazo)
  - **q3 (Reação à Volatilidade):** c1 (Vende tudo) -> c4 (Compra mais)

  **Instruções de Análise:**
  1.  **Determinar o Perfil:** Com base nas respostas, classifique o perfil como 'Conservador', 'Moderado' ou 'Arrojado'.
      -   **Conservador:** Prioriza segurança e preservação de capital. Respostas tendem a ser a1, b1, c1/c2.
      -   **Moderado:** Busca um equilíbrio entre segurança e rentabilidade, aceitando alguma volatilidade. Respostas tendem a ser a2/a3, b2/b3, c2/c3.
      -   **Arrojado:** Foca em maximizar ganhos, mesmo com alto risco e volatilidade. Respostas tendem a ser a3/a4, b3/b4, c3/c4.

  2.  **Escrever a Análise (analysis):** Elabore um texto claro e didático. Explique o perfil, o que significa a tolerância ao risco do investidor e como isso impacta as escolhas de investimento. Dê um tom encorajador e educativo.

  3.  **Sugerir Alocação de Ativos (assetAllocation):** Crie uma carteira diversificada e adequada ao perfil. A soma das porcentagens deve ser 100.
      -   **Conservador:** Maior parte em Renda Fixa (Pós-fixada, IPCA+). Pequena parte em Fundos Imobiliários.
      -   **Moderado:** Equilíbrio entre Renda Fixa, Fundos Imobiliários e Ações (Brasil/Exterior).
      -   **Arrojado:** Maior parte em Renda Variável (Ações, FIIs, Ativos Internacionais), com uma parcela menor em Renda Fixa para reserva.

  4.  **Fornecer Recomendações (recommendations):** Dê 2 ou 3 dicas práticas. Ex: "Comece estudando sobre Renda Fixa", "Considere abrir conta em uma corretora" ou "Lembre-se de construir sua reserva de emergência antes de tudo".

  **Respostas do Usuário para Análise:**
  {{{json answers}}}

  Analise os dados e retorne o resultado no formato JSON solicitado.`,
});


const analyzeInvestorProfileFlow = ai.defineFlow(
  {
    name: 'analyzeInvestorProfileFlow',
    inputSchema: InvestorProfileInputSchema,
    outputSchema: InvestorProfileOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a análise de perfil.');
    }
    return output;
  }
);
