'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
  transactionCategories,
  ExtractFromFileInputSchema,
  ExtractFromFileOutputSchema,
  type ExtractFromFileInput,
  type ExtractFromFileOutput
} from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

export const extractFromFile = ai.defineFlow(
  {
    name: 'extractFromFileFlow',
    inputSchema: ExtractFromFileInputSchema,
    outputSchema: ExtractFromFileOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina, uma especialista em processar extratos bancários de diversos formatos (CSV, OFX, PDF). Sua tarefa é analisar o conteúdo de um arquivo, extrair todas as transações financeiras e retorná-las em um formato JSON estruturado.

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
  ${transactionCategories.join('\n- ')}

  **Nome do Arquivo (para contexto):** ${input.fileName}
  **Conteúdo do Arquivo para Análise:**
  (O conteúdo está no formato de data URI na próxima parte da mensagem)

  Analise o conteúdo e retorne a lista de transações no formato JSON especificado.`;

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: [
            { text: prompt },
            { media: { url: input.fileContent } }
        ],
        config: {
          retries: 3,
        },
        output: {
            format: 'json',
            schema: ExtractFromFileOutputSchema
        }
    });

    const output = result.output;
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar o arquivo.');
    }
    return output;
  }
);
