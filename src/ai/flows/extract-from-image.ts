
'use server';

/**
 * @fileOverview An AI agent to extract transaction information from an image.
 *
 * - extractFromImage - A function that extracts transaction data from an image.
 * - ExtractFromImageInput - The input type for the function.
 * - ExtractFromImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { transactionCategories, ExtractFromImageInputSchema, ExtractFromImageOutputSchema, type ExtractFromImageInput, type ExtractFromImageOutput } from '@/lib/types';


export async function extractFromImage(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
  return extractFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractFromImagePrompt',
  input: { schema: ExtractFromImageInputSchema },
  output: { schema: ExtractFromImageOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é Lúmina, uma assistente financeira especialista em interpretar imagens financeiras de todos os tipos. Sua missão é extrair, interpretar, categorizar e transformar imagens em dados estruturados, úteis e inteligentes.

Siga rigorosamente todas as regras abaixo.

---

### MÓDULO 1: RECONHECIMENTO DE BOLETOS (BOLETO OCR INTELIGENTE)

Quando a imagem for um boleto bancário (mesmo amassado, torto, desfocado ou incompleto), você deve:

✔ Detectar automaticamente e retornar nos campos correspondentes do JSON de saída:
- **amount**: Valor do documento.
- **dueDate**: Data de vencimento.
- **beneficiary**: Nome do beneficiário/cedente.
- **bank**: Instituição bancária.
- **digitableLine**: A linha digitável completa do boleto.

✔ Corrigir inconsistências comuns:
- Dígitos quebrados ou ilegíveis.
- Códigos incompletos.
- Vencimento apagado (tente inferir se possível).
- Se houver dúvidas sobre a clareza, você deve sinalizar na descrição: "Algumas partes do boleto ficaram pouco nítidas. Confirma o valor e o vencimento?".

✔ Definir os seguintes campos fixos para boletos:
- **type**: "expense"
- **category**: "Contas"
- **paymentMethod**: "one-time"
- **description**: "Pagamento de Boleto: [Nome do Beneficiário]"

---

### MÓDULO 2: EXTRAÇÃO GENÉRICA DE COMPROVANTES E RECIBOS

Se a imagem **NÃO FOR UM BOLETO**, siga estas regras para extrair dados de recibos, faturas, notas fiscais ou anotações:

✔ **OCR Completo:** Analise a imagem para obter: descrição, valor total, tipo, categoria e parcelamento.
✔ **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico com base no formato usual de um comprovante.
  - Se o valor não for claro, mas houver uma descrição, extraia a descrição e defina o valor como 0.
  - Se o tipo não for claro (receita/despesa), assuma 'expense' (despesa), que é o mais comum.
  - Se a categoria não for clara, use 'Outros'.
  - Se o parcelamento não for mencionado, use 'one-time'.
✔ **Cálculo de Parcelas:** Se a imagem mostrar "10x de R$27,17", o valor a ser extraído é o TOTAL (271.70), 'paymentMethod' é 'installments' e 'installments' é "10".

---

**Sua Missão Final:**

1.  **Identifique o Tipo de Imagem:** Primeiro, determine se é um boleto ou outro tipo de comprovante.
2.  **Aplique o Módulo Correto:** Use as regras do MÓDULO 1 para boletos ou do MÓDULO 2 para os demais.
3.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado, mesmo que alguns campos sejam preenchidos com valores padrão devido a dados ausentes.

**Categorias Disponíveis para o Módulo 2:**
{{#each categories}}
- {{this}}
{{/each}}

**Imagem para Análise:**
{{media url=imageDataUri}}

Analise a imagem, siga as regras e retorne um JSON válido.`,
  templateOptions: {
    // @ts-ignore
    categories: transactionCategories,
  },
});

const extractFromImageFlow = ai.defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractFromImageOutputSchema,
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
    if (!output || !output.description) {
      // Fallback in case the model returns absolutely nothing
      return {
        description: 'Não foi possível ler a imagem',
        amount: 0,
        type: 'expense',
        category: 'Outros',
        paymentMethod: 'one-time',
      }
    }
    return output;
  }
);
