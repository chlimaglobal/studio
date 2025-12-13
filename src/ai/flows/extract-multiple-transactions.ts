
'use server';

import { ai } from '@/ai/genkit';
import {
  ExtractMultipleTransactionsInputSchema,
  ExtractMultipleTransactionsOutputSchema,
} from '@/lib/definitions';
import { transactionCategories } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

export const extractMultipleTransactions = ai.defineFlow(
  {
    name: 'extractMultipleTransactionsFlow',
    inputSchema: ExtractMultipleTransactionsInputSchema,
    outputSchema: ExtractMultipleTransactionsOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma assistente financeira especialista em interpretar texto em lote. Sua tarefa é analisar um bloco de texto, onde cada linha representa uma transação, e retornar uma lista de transações estruturadas.

**Sua Missão:**
1.  **Processe Linha por Linha:** Analise cada linha do texto como uma transação separada.
2.  **Extraia os Dados:** Para cada linha, extraia: descrição, valor, e categoria.
3.  **Seja Resiliente:** Se um dado estiver faltando em uma linha, infira os valores mais lógicos.
    -   O tipo padrão é 'expense' (despesa).
    -   Se o valor não for mencionado, use 0.
4.  **Categorização Automática:** Use a descrição para inferir a categoria mais apropriada da lista fornecida.
5.  **Retorne um JSON Válido:** Sua resposta DEVE ser um objeto JSON com uma chave 'transactions', contendo um array de objetos de transação. Ignore linhas em branco ou que não pareçam ser transações.

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

**Exemplo:**
- **Texto de Entrada:**
  \`\`\`
  almoço no shopping 45.50
  gasolina 150
  cinema 32
  \`\`\`
- **Saída Esperada (JSON):**
  \`\`\`json
  {
    "transactions": [
      { "description": "Almoço no shopping", "amount": 45.50, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" },
      { "description": "Gasolina", "amount": 150, "type": "expense", "category": "Combustível", "paymentMethod": "one-time" },
      { "description": "Cinema", "amount": 32, "type": "expense", "category": "Cinema", "paymentMethod": "one-time" }
    ]
  }
  \`\`\`

**Texto do usuário para análise:**
\`\`\`
${input.text}
\`\`\`
`;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: {
        format: 'json',
        schema: ExtractMultipleTransactionsOutputSchema,
      },
    });

    const output = llmResponse.output;
    if (!output || !output.transactions) {
      // Return an empty list if the model fails to produce valid output
      return { transactions: [] };
    }

    return output;
  }
);
