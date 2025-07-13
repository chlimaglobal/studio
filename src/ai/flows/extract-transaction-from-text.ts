
'use server';

/**
 * @fileOverview Um agente de IA para extrair informações de transações de texto em linguagem natural.
 *
 * - extractTransactionFromText - Uma função que extrai dados de transação de uma string.
 * - ExtractTransactionInput - O tipo de entrada para a função extractTransactionFromText.
 * - ExtractTransactionOutput - O tipo de retorno para a função extractTransactionFromText.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { transactionCategories } from '@/lib/types';

const ExtractTransactionInputSchema = z.object({
  text: z.string().describe('O texto em linguagem natural fornecido pelo usuário sobre uma transação.'),
});
export type ExtractTransactionInput = z.infer<typeof ExtractTransactionInputSchema>;

const ExtractTransactionOutputSchema = z.object({
  description: z.string().describe('Uma descrição concisa da transação.'),
  amount: z.number().describe('O valor numérico da transação.'),
  type: z.enum(['income', 'expense']).describe('O tipo da transação (receita ou despesa).'),
  category: z.enum(transactionCategories).optional().describe('A categoria sugerida para a transação, se puder ser inferida.'),
});
export type ExtractTransactionOutput = z.infer<typeof ExtractTransactionOutputSchema>;

export async function extractTransactionFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
  return extractTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionPrompt',
  input: { schema: ExtractTransactionInputSchema },
  output: { schema: ExtractTransactionOutputSchema },
  prompt: `Você é um assistente financeiro especialista em interpretar texto de linguagem natural para extrair detalhes de transações.
  Sua tarefa é analisar o texto do usuário e extrair a descrição, o valor e o tipo de transação (receita ou despesa).
  A descrição deve ser um resumo curto e objetivo do que foi a transação.
  O valor deve ser um número. Interprete valores como "cento e cinquenta e 75" como 150.75.

  - Se o usuário disser "gastei", "comprei", "paguei", "despesa", "conta de", etc., o tipo é 'expense'.
  - Se o usuário disser "recebi", "ganhei", "vendi", "receita", "salário", etc., o tipo é 'income'.
  - Se mencionar serviços como Netflix, Spotify, Amazon Prime, o tipo é 'expense' e a categoria é 'Assinaturas'.

  **Exemplos:**

  1.  **Texto do Usuário:** "gastei 25 reais no almoço de hoje"
      **Saída Esperada:** { "description": "Almoço", "amount": 25, "type": "expense", "category": "Restaurante" }

  2.  **Texto do Usuário:** "recebi 500 de comissão"
      **Saída Esperada:** { "description": "Comissão", "amount": 500, "type": "income", "category": "Comissão" }
      
  3.  **Texto do Usuário:** "supermercado 150 e 75"
      **Saída Esperada:** { "description": "Supermercado", "amount": 150.75, "type": "expense", "category": "Supermercado" }

  4.  **Texto do Usuário:** "pagamento da fatura do cartão 1200"
      **Saída Esperada:** { "description": "Pagamento da fatura do cartão", "amount": 1200, "type": "expense", "category": "Cartão de Crédito" }

  5.  **Texto do Usuário:** "conta de luz 85 reais"
      **Saída Esperada:** { "description": "Conta de luz", "amount": 85, "type": "expense", "category": "Luz" }

  6.  **Texto do Usuário:** "cinquenta e cinco e cinquenta no ifood"
      **Saída Esperada:** { "description": "iFood", "amount": 55.50, "type": "expense", "category": "Restaurante" }
      
  7.  **Texto do Usuário:** "uber 23,40"
      **Saída Esperada:** { "description": "Uber", "amount": 23.40, "type": "expense", "category": "Transporte" }

  8.  **Texto do Usuário:** "paguei o spotify"
      **Saída Esperada:** { "description": "Spotify", "amount": 0, "type": "expense", "category": "Assinaturas" }
      
  9.  **Texto do Usuário:** "netflix R$ 39.90"
      **Saída Esperada:** { "description": "Netflix", "amount": 39.90, "type": "expense", "category": "Assinaturas" }

  **Texto do usuário para análise:**
  {{{text}}}
  `,
});

const extractTransactionFlow = ai.defineFlow(
  {
    name: 'extractTransactionFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.amount || !output.description || !output.type) {
      throw new Error('A IA não conseguiu processar a solicitação ou os dados estão incompletos.');
    }
    return output;
  }
);
