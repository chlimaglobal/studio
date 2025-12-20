
import { ai, defineFlow } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";
import { 
    AlexaExtractTransactionInputSchema,
    AlexaExtractTransactionOutputSchema,
    GetSimpleFinancialSummaryInputSchema,
    GetSimpleFinancialSummaryOutputSchema
} from "../types";

export const alexaExtractTransactionFlow = defineFlow(
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
  "category": "Renda",
  "description": "Comissão",
  "date": "2025-12-18"
}

---

Agora processe o texto enviado pelo usuário: ${input.text}
`;
    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: { format: 'json', schema: AlexaExtractTransactionOutputSchema },
    });
    return llmResponse.output();
  }
);


export const getSimpleFinancialSummaryFlow = defineFlow(
    {
        name: 'getSimpleFinancialSummaryFlow',
        inputSchema: GetSimpleFinancialSummaryInputSchema,
        outputSchema: GetSimpleFinancialSummaryOutputSchema,
    },
    async (input) => {
        const prompt = `Você é a Lúmina, assistente financeira pessoal do usuário. Sua tarefa é gerar um RESUMO FINANCEIRO SIMPLES, baseado nos dados já calculados pelo sistema.

O sistema fornecerá:
- totalIncome: ${input.totalIncome}
- totalExpense: ${input.totalExpense}
- balance: ${input.balance}
- period: ${input.period}

Seu objetivo é responder em linguagem natural, curta, clara e objetiva, adequada para resposta por voz da Alexa.

EXEMPLOS:
Entrada: period: "today", totalExpense: 125
Resposta: "Hoje você gastou cento e vinte e cinco reais."

Entrada: period: "month", totalIncome: 8000, totalExpense: 5200, balance: 2800
Resposta: "Neste mês, você recebeu oito mil reais, gastou cinco mil e duzentos, e seu saldo atual é de dois mil e oitocentos reais."

Agora gere a resposta para os dados fornecidos.`;

        const result = await ai.generate({
            model: googleAI.model('gemini-1.5-flash'),
            prompt: prompt,
        });

        return { summary: result.text || 'Não consegui gerar o resumo.' };
    }
);
