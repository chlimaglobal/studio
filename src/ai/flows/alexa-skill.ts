
'use server';

import { ai } from '@/ai/genkit';
import {
    AlexaExtractTransactionInputSchema,
    AlexaExtractTransactionOutputSchema
} from '@/lib/definitions';
import { googleAI } from '@genkit-ai/google-genai';

export const extractSingleTransactionFromVoiceFlow = ai.defineFlow(
  {
    name: 'alexaExtractTransactionFlow',
    inputSchema: AlexaExtractTransactionInputSchema,
    outputSchema: AlexaExtractTransactionOutputSchema,
  },
  async (input) => {
    
    const prompt = `Você é a Lúmina, uma assistente financeira inteligente.

Sua tarefa é extrair **UMA ÚNICA TRANSAÇÃO FINANCEIRA** a partir de um texto falado pelo usuário (entrada de voz da Alexa).

⚠️ REGRAS OBRIGATÓRIAS:
1. Extraia APENAS UMA transação.
2. Se houver mais de uma transação no texto, use APENAS A PRIMEIRA.
3. Se nenhuma transação válida for encontrada, retorne null.
4. O resultado DEVE seguir exatamente o schema abaixo.
5. A categorização deve seguir o mesmo padrão usado no cadastro manual de transações.
6. A data deve ser definida automaticamente:
   - Se o usuário não informar data, use a data atual.
7. Diferencie corretamente:
   - Receita (entrada)
   - Despesa (saída)
8. Nunca invente valores ou categorias.

---

## 🧾 SCHEMA DE SAÍDA (OBRIGATÓRIO – JSON PURO)

{
  "amount": number,
  "type": "income" | "expense",
  "category": string,
  "description": string,
  "date": "YYYY-MM-DD"
}

---

## 🧠 EXEMPLOS

Entrada:
"gastei 45 reais no mercado hoje"

Saída:
{
  "amount": 45,
  "type": "expense",
  "category": "Alimentação",
  "description": "Mercado",
  "date": "2025-12-18"
}

Entrada:
"recebi 3 mil reais de comissão"

Saída:
{
  "amount": 3000,
  "type": "income",
  "category": "Comissão",
  "description": "Comissão",
  "date": "2025-12-18"
}

---

Agora processe o texto enviado pelo usuário: ${input.text}
`;

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            format: 'json',
            schema: AlexaExtractTransactionOutputSchema
        }
    });

    const output = result.output;
    
    // O schema já permite null, então se a IA retornar null, o fluxo retornará null.
    // Se a IA não retornar nada (undefined), lançamos um erro.
    if (output === undefined) {
      throw new Error('A Lúmina não conseguiu processar o comando de voz.');
    }
    
    return output;
  }
);
