
'use server';

/**
 * @fileOverview Um agente de IA para extrair informações de transações de texto em linguagem natural.
 *
 * - extractTransactionFromText - Uma função que extrai dados de transação de uma string.
 * - ExtractTransactionInput - O tipo de entrada para a função extractTransactionFromText.
 * - ExtractTransactionOutput - O tipo de retorno para a função extractTransactionFromText.
 */

import { ai } from '@/ai/genkit';
import {
  ExtractTransactionInputSchema,
  ExtractTransactionOutputSchema,
  type ExtractTransactionInput,
  type ExtractTransactionOutput,
} from '@/lib/types';


export async function extractTransactionFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
  return extractTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionPrompt',
  input: { schema: ExtractTransactionInputSchema },
  output: { schema: ExtractTransactionOutputSchema },
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `Você é a Lúmina, uma assistente financeira especialista em interpretar texto de linguagem natural para extrair detalhes de transações.
  Sua tarefa é analisar o texto do usuário e extrair a descrição, o valor, o tipo de transação (receita ou despesa) e se é um pagamento parcelado.
  A descrição deve ser um resumo curto e objetivo do que foi a transação.
  O valor deve ser um número. Interprete valores como "cento e cinquenta e 75" como 150.75. **SEMPRE** interprete "vírgula" ou "e" como um separador decimal quando apropriado para a moeda.
  Se o usuário mencionar "parcelado", "vezes", "x" (ex: 10x de...), "parcelas", identifique como 'installments' em 'paymentMethod' e extraia o número de parcelas. O valor da transação deve ser o VALOR TOTAL da compra, não o valor da parcela.

  - Se o usuário disser "gastei", "comprei", "paguei", "despesa", "conta de", etc., o tipo é 'expense'.
  - Se o usuário disser "recebi", "ganhei", "vendi", "receita", "salário", etc., o tipo é 'income'.
  - Se mencionar serviços como Netflix, Spotify, Amazon Prime, o tipo é 'expense' e a categoria é 'Streamings'.

  **Exemplos:**

  1.  **Texto do Usuário:** "gastei 25 reais no almoço de hoje"
      **Saída Esperada:** { "description": "Almoço", "amount": 25, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" }

  2.  **Texto do Usuário:** "recebi 500 de comissão"
      **Saída Esperada:** { "description": "Comissão", "amount": 500, "type": "income", "category": "Comissão", "paymentMethod": "one-time" }
      
  3.  **Texto do Usuário:** "Comprei um celular novo por 3 mil reais em 10 vezes"
      **Saída Esperada:** { "description": "Celular novo", "amount": 3000, "type": "expense", "category": "Compras", "paymentMethod": "installments", "installments": "10" }

  4.  **Texto do Usuário:** "pagamento da fatura do cartão 1200"
      **Saída Esperada:** { "description": "Pagamento da fatura do cartão", "amount": 1200, "type": "expense", "category": "Cartão de Crédito", "paymentMethod": "one-time" }

  5.  **Texto do Usuário:** "farmácia 271,70 em 10x"
      **Saída Esperada:** { "description": "Farmácia", "amount": 271.70, "type": "expense", "category": "Farmácia", "paymentMethod": "installments", "installments": "10" }

  6.  **Texto do Usuário:** "cinquenta e cinco e cinquenta no ifood"
      **Saída Esperada:** { "description": "iFood", "amount": 55.50, "type": "expense", "category": "Delivery", "paymentMethod": "one-time" }
      
  7.  **Texto do Usuário:** "uber 23,40"
      **Saída Esperada:** { "description": "Uber", "amount": 23.40, "type": "expense", "category": "Táxi/Uber", "paymentMethod": "one-time" }

  8.  **Texto do Usuário:** "paguei o spotify"
      **Saída Esperada:** { "description": "Spotify", "amount": 0, "type": "expense", "category": "Streamings", "paymentMethod": "one-time" }
      
  9.  **Texto do Usuário:** "netflix R$ 39.90"
      **Saída Esperada:** { "description": "Netflix", "amount": 39.90, "type": "expense", "category": "Streamings", "paymentMethod": "one-time" }

  10. **Texto do Usuário:** "teste trezentos e treze e trinta"
      **Saída Esperada:** { "description": "Teste", "amount": 313.30, "type": "expense", "category": "Outros", "paymentMethod": "one-time" }

  **Texto do usuário para análise:**
  {{{text}}}
  `,
});

const extractTransactionFlow = ai.defineFlow(
  {
    name: 'extractTransactionFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
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
    // Relaxed validation: only description and type are strictly required to proceed.
    // Amount can be zero if not detected, and category is optional.
    if (!output || !output.description || !output.type) {
      throw new Error('A Lúmina não conseguiu processar a solicitação ou os dados essenciais (descrição e tipo) estão incompletos.');
    }
    return output;
  }
);

    
