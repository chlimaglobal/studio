
'use server';

/**
 * @fileOverview An AI agent to extract financial transactions from various file formats.
 *
 * - extractFromFile - A function that extracts transactions from file content.
 * - ExtractFromFileInput - The input type for the function.
 * - ExtractFromFileOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { transactionCategories } from '@/lib/types';

const ExtractFromFileInputSchema = z.object({
  fileContent: z.string().describe("The content of the financial statement file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileName: z.string().describe("The name of the file, which can provide context about the bank or format (e.g., 'statement.csv', 'extrato.ofx')."),
});
export type ExtractFromFileInput = z.infer<typeof ExtractFromFileInputSchema>;

export const ExtractedTransactionSchema = z.object({
    date: z.string().describe("The transaction date in YYYY-MM-DD format."),
    description: z.string().describe("The description of the transaction."),
    amount: z.number().describe("The numerical value of the transaction. For expenses, this should be a positive number."),
    type: z.enum(['income', 'expense']).describe("The type of transaction."),
    category: z.enum(transactionCategories as [string, ...string[]]).describe("The most likely category for the transaction."),
});

const ExtractFromFileOutputSchema = z.object({
  transactions: z.array(ExtractedTransactionSchema).describe('A list of transactions extracted from the file.'),
});

export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;
export type ExtractFromFileOutput = z.infer<typeof ExtractFromFileOutputSchema>;


export async function extractFromFile(input: ExtractFromFileInput): Promise<ExtractFromFileOutput> {
  return extractFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractFromFilePrompt',
  input: { schema: ExtractFromFileInputSchema },
  output: { schema: ExtractFromFileOutputSchema },
  prompt: `Você é um especialista em processar extratos bancários de diversos formatos (CSV, OFX, PDF). Sua tarefa é analisar o conteúdo de um arquivo, extrair todas as transações financeiras e retorná-las em um formato JSON estruturado.

  **Instruções de Processamento:**
  1.  **Analise o Conteúdo:** O conteúdo do arquivo será fornecido como uma string. Identifique o formato (mesmo que a extensão seja genérica) e a estrutura dos dados.
  2.  **Extraia os Campos:** Para cada transação, extraia as seguintes informações:
      -   \`date\`: A data da transação. Normalize para o formato **YYYY-MM-DD**.
      -   \`description\`: A descrição da transação.
      -   \`amount\`: O valor da transação. Deve ser sempre um número **positivo**.
      -   \`type\`: Determine se é 'income' (receita) ou 'expense' (despesa). Em muitos extratos, despesas são representadas por valores negativos.
      -   \`category\`: Sugira a categoria mais apropriada para a transação com base na descrição, usando a lista de categorias fornecida.
  3.  **Lógica de Tipos:**
      -   Se o valor for positivo no extrato, geralmente é 'income'.
      -   Se o valor for negativo, é 'expense'. O \`amount\` no JSON de saída deve ser o valor absoluto (positivo).
  4.  **Categorização**: Use a descrição para inferir a categoria mais provável. Por exemplo, "UBER TRIP" deve ser "Táxi/Uber". "PADARIA DO ZE" deve ser "Padaria".
  5.  **Retorno:** Retorne um objeto JSON contendo uma única chave \`transactions\`, que é um array de todos os objetos de transação que você conseguiu extrair.

  **Categorias Disponíveis para \`category\`:**
  {{#each categories}}
  - {{this}}
  {{/each}}

  **Nome do Arquivo (para contexto):** {{{fileName}}}
  **Conteúdo do Arquivo para Análise:**
  {{media url=fileContent}}

  Analise o conteúdo e retorne a lista de transações no formato JSON especificado.`,
  templateOptions: {
    // @ts-ignore
    categories: transactionCategories,
  },
});

const extractFromFileFlow = ai.defineFlow(
  {
    name: 'extractFromFileFlow',
    inputSchema: ExtractFromFileInputSchema,
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A IA não conseguiu processar o arquivo.');
    }
    return output;
  }
);
