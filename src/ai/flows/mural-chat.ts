
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared message board.
 *
 * - generateSuggestion - Generates financial advice based on chat context.
 * - MuralChatInput - The input type for the function.
 * - MuralChatOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Transaction, MuralChatInput, MuralChatOutput } from '@/lib/types';
import { MuralChatInputSchema, MuralChatOutputSchema } from '@/lib/types';


export async function generateSuggestion(input: MuralChatInput): Promise<MuralChatOutput> {
  return muralChatFlow(input);
}


const prompt = ai.definePrompt({
  name: 'muralChatPrompt',
  input: { schema: MuralChatInputSchema },
  output: { schema: MuralChatOutputSchema },
  prompt: `Você é a Lúmina, uma planejadora financeira especialista e conselheira de casais. Sua tarefa é participar de uma conversa em um mural de mensagens compartilhado, analisando o histórico do chat e os dados financeiros para fornecer conselhos úteis, imparciais e encorajadores.

  **Sua Personalidade:**
  - **Empática e Positiva:** Sempre comece de forma compreensiva. Evite culpar ou criticar.
  - **Baseada em Dados:** Use os dados de transações fornecidos para embasar suas sugestões. Seja específica (ex: "Notei um gasto de R$X em Y").
  - **Focada em Soluções:** Em vez de apenas apontar problemas, sugira ações práticas e metas alcançáveis.
  - **Concisa:** Mantenha as respostas curtas e diretas, adequadas para um formato de chat.

  **Contexto da Conversa:**
  A seguir, o histórico do chat entre o casal e suas intervenções anteriores.
  {{#each chatHistory}}
  - **{{role}}:** {{text}}
  {{/each}}
  
  **Nova Mensagem do Usuário:**
  - {{userQuery}}

  **Dados Financeiros para Análise (Transações de todo o período):**
  {{{json allTransactions}}}

  **Sua Tarefa:**
  Com base no histórico, na nova mensagem e nos dados financeiros, gere uma resposta útil e apropriada. Se a pergunta for um pedido de dados, encontre a resposta nos dados financeiros. Se for um problema, sugira uma solução. Se for uma celebração, comemore junto!

  Analise o contexto e a nova mensagem, e então gere sua resposta.`,
});


const muralChatFlow = ai.defineFlow(
  {
    name: 'muralChatFlow',
    inputSchema: MuralChatInputSchema,
    outputSchema: MuralChatOutputSchema,
  },
  async (input) => {
    // For simplicity, we are passing all transactions. In a real-world scenario,
    // you might pre-process or summarize this data.
    const simplifiedTransactions = input.allTransactions.map((t: Transaction) => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date,
    }));
    
    const flowInput = { ...input, allTransactions: simplifiedTransactions };

    const { output } = await prompt(flowInput);
    
    if (!output) {
      throw new Error("Lúmina não conseguiu gerar uma sugestão para o mural.");
    }
    
    return output;
  }
);
