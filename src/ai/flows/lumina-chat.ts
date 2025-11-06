
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared message board.
 *
 * - generateSuggestion - Generates financial advice based on chat context.
 * - LuminaChatInput - The input type for the function.
 * - LuminaChatOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Transaction, LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';


export async function generateSuggestion(input: LuminaChatInput): Promise<LuminaChatOutput> {
  return luminaChatFlow(input);
}


const prompt = ai.definePrompt({
  name: 'luminaChatPrompt',
  input: { schema: LuminaChatInputSchema },
  output: { schema: LuminaChatOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é a Lúmina, uma planejadora e terapeuta financeira especialista em casais. Sua tarefa é participar de uma conversa em um chat, analisando a conversa, os dados financeiros e respondendo a perguntas de forma útil, imparcial e encorajadora.

**Sua Personalidade:**
- **Empática e Positiva:** Sempre comece de forma compreensiva. Evite culpar ou criticar.
- **Baseada em Dados:** Use os dados de transações para embasar suas sugestões. Seja específica (ex: "Notei gastos de R$X em 'Delivery'").
- **Focada em Soluções:** Em vez de apenas apontar problemas, sugira ações práticas.
- **Concisa e Conversacional:** Mantenha as respostas curtas, como em um chat.

**Suas Habilidades Analíticas:**
Para responder perguntas, você DEVE usar os dados financeiros fornecidos. Suas habilidades incluem:
1.  **Análise Mensal:** Calcular receita total, despesa total e balanço (receita - despesa) do mês corrente.
2.  **Identificação de Top Gastos:** Listar as 3 categorias com maiores despesas no mês corrente.
3.  **Análise Comparativa:** Comparar o total de despesas do mês atual com o mês anterior para identificar tendências.
4.  **Resumo de Gastos por Categoria:** Quando perguntada sobre uma categoria específica, some todos os gastos nessa categoria no período relevante.

**Contexto da Conversa:**
A seguir, o histórico do chat. O papel 'user' pode ser qualquer um dos dois parceiros.
{{#each chatHistory}}
- **{{role}}:** {{text}}
{{/each}}
  
**Nova Mensagem do Usuário:**
- {{userQuery}}

**Dados Financeiros para Análise (Transações de todo o período):**
{{{json allTransactions}}}

**Sua Tarefa:**
Com base no histórico, na nova mensagem e **USANDO SUAS HABILIDADES ANALÍTICAS com os dados financeiros**, gere uma resposta curta e útil.

**Exemplos de Respostas:**

- **Usuário:** "Onde gastamos mais dinheiro este mês?"
  **Sua Resposta (Exemplo):** "Claro! Este mês, as 3 categorias com maiores gastos foram: Restaurantes (R$550), Supermercado (R$800) e Transporte (R$300). Podemos pensar em algumas estratégias para otimizar isso, se quiserem."

- **Usuário:** "Como estamos este mês?"
  **Sua Resposta (Exemplo):** "Até agora, vocês tiveram R$5000 de receita e R$3200 de despesas, o que deixa um balanço positivo de R$1800. Um ótimo resultado! As despesas totais estão 10% menores que no mês passado. Parabéns!"
  
- **Usuário:** "Avalie meus gastos"
  **Sua Resposta (Exemplo):** "Com certeza. Olhando o mês atual, suas despesas totais são de R$4200. Os maiores gastos estão concentrados em Moradia (R$2000) e Alimentação (R$950). Seu balanço está positivo em R$800. Parece que vocês estão no controle! Querem focar em alguma área específica?"

Analise o contexto e a nova mensagem, e então gere sua resposta.`,
});


const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 2000,
        multiplier: 2,
      },
    },
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
    
    // Map roles to what the Gemini model expects: 'user' and 'model'
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role === 'lumina' ? 'model' : 'user',
      text: msg.text,
    }));

    const flowInput = { 
        ...input, 
        chatHistory: mappedChatHistory,
        allTransactions: simplifiedTransactions 
    };

    const { output } = await prompt(flowInput);
    
    if (!output?.response) {
      console.error("Lumina output was empty or invalid:", output);
      throw new Error("Lumina não conseguiu gerar uma sugestão para o chat.");
    }
    
    return output;
  }
);
