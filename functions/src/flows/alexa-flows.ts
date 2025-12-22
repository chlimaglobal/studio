import { z } from "genkit";

// Schemas
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from "../types";

/**
 * Flow: alexaExtractTransactionFlow
 * Extrai UMA transação financeira a partir do texto falado
 */
export const alexaExtractTransactionFlow = {
  name: "alexaExtractTransactionFlow",
  inputSchema: AlexaExtractTransactionInputSchema,
  outputSchema: AlexaExtractTransactionOutputSchema,

  async run(input: z.infer<typeof AlexaExtractTransactionInputSchema>, ctx: any) {
    const ai = ctx.ai;

    const prompt = `
Você é a Lúmina, uma assistente financeira inteligente.

Sua tarefa é extrair **UMA ÚNICA TRANSAÇÃO FINANCEIRA** a partir de um texto falado pelo usuário.

REGRAS OBRIGATÓRIAS:
1. Extraia apenas UMA transação.
2. Se houver mais de uma, use apenas a PRIMEIRA.
3. Se nenhuma transação válida for encontrada, retorne null.
4. O resultado DEVE seguir EXATAMENTE o schema fornecido.
5. Não invente valores, datas ou categorias.
6. Se o usuário não informar data, use a data atual.
7. Diferencie corretamente:
   - income (receita)
   - expense (despesa)

Texto do usuário:
${input.text}
`;

    const result = await ai.generate({
      prompt,
      output: {
        format: "json",
        schema: AlexaExtractTransactionOutputSchema,
      },
    });

    if (!result.output) {
      return null;
    }

    // 🔒 Narrowing explícito para satisfazer o TypeScript
    const type: "income" | "expense" =
      result.output.type === "income" ? "income" : "expense";

    return {
      amount: result.output.amount,
      description: result.output.description,
      category: result.output.category,
      date: result.output.date,
      type,
    };
  },
};

/**
 * Flow: getSimpleFinancialSummaryFlow
 * Gera um resumo financeiro curto e amigável para a Alexa
 */
export const getSimpleFinancialSummaryFlow = {
  name: "getSimpleFinancialSummaryFlow",
  inputSchema: GetSimpleFinancialSummaryInputSchema,
  outputSchema: GetSimpleFinancialSummaryOutputSchema,

  async run(
    input: z.infer<typeof GetSimpleFinancialSummaryInputSchema>,
    ctx: any
  ) {
    const ai = ctx.ai;

    const prompt = `
Você é a Lúmina, assistente financeira pessoal do usuário.

Gere um resumo financeiro CURTO, claro e amigável para ser lido pela Alexa.

Dados:
- Receitas: ${input.totalIncome}
- Despesas: ${input.totalExpense}
- Saldo: ${input.balance}
- Período: ${input.period}
`;

    const result = await ai.generate({ prompt });

    return {
      summary:
        result.text ??
        "Não consegui gerar o resumo financeiro no momento.",
    };
  },
};
