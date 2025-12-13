
'use server';

import { ai } from '@/ai/genkit';
import {
  transactionCategories,
  CategorizeTransactionInputSchema,
  CategorizeTransactionOutputSchema,
} from '@/lib/types';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

export const categorizeTransaction = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"
- "Almoço com amigos" -> "Restaurante"
- "Cinema ingresso" -> "Cinema"
- "iFood" -> "Delivery"
- "Conta de luz" -> "Luz"
- "Mensalidade da academia" -> "Assinaturas/Serviços"
- "Compra no mercado" -> "Supermercado"
- "Uber" -> "Táxi/Uber"
- "Netflix" -> "Streamings"
- "Salário da empresa X" -> "Salário"

**Categorias Disponíveis:**
${transactionCategories.join('\n- ')}

Analise a descrição a seguir e retorne **apenas uma** categoria da lista. Seja o mais específico possível.

**Descrição da Transação:** ${input.description}
`;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: {
        format: 'json',
        schema: CategorizeTransactionOutputSchema,
      },
    });

    const output = llmResponse.output;
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a categorização.');
    }
    return output;
  }
);
