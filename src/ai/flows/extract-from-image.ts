
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { transactionCategories, ExtractFromImageInputSchema, ExtractFromImageOutputSchema, type ExtractFromImageInput, type ExtractFromImageOutput } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

export const extractFromImage = ai.defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractFromImageOutputSchema,
  },
  async (input) => {
    const prompt = `Você é Lúmina, uma assistente financeira especialista em interpretar imagens financeiras de todos os tipos. Sua missão é extrair, interpretar, categorizar e transformar imagens em dados estruturados, úteis e inteligentes.

Siga rigorosamente todas as regras abaixo.

---

### MÓDULO 0: INTELIGÊNCIA DE CONTEXTO

Antes de analisar a imagem, considere o histórico de transações do usuário para fazer deduções mais inteligentes, especialmente se a imagem for de baixa qualidade.
- **Histórico Financeiro:** Verifique categorias, estabelecimentos e valores recorrentes.
- **Exemplo:** Se o usuário sempre gasta com "Netflix" na mesma data e o recibo está pouco nítido, é provável que seja a assinatura da Netflix. Categoria: "Streamings".

---

### MÓDULO 1: RECONHECIMENTO DE BOLETOS (BOLETO OCR INTELIGENTE)

Quando a imagem for um boleto bancário (mesmo amassado, torto, desfocado ou incompleto), você deve:

✔ Detectar automaticamente e retornar nos campos correspondentes do JSON de saída:
- **amount**: Valor do documento.
- **dueDate**: Data de vencimento (formato YYYY-MM-DD).
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

### MÓDULO 2: RECONHECIMENTO DE LOGOS E MARCAS

Se a imagem não for um boleto, tente identificar logos, ícones, cores e elementos visuais de marcas como Nubank, Inter, Santander, Caixa, Bradesco, PicPay, Mercado Pago, iFood, Rappi, Uber, 99, Shopee, Amazon, NetFlix, Spotify, Apple, Google, e marcas de supermercados.

✔ Ao identificar um logo, infira automaticamente a categoria e o tipo da transação.
  - **Exemplo:** Logo do iFood -> Categoria: "Delivery", Tipo: "expense".
  - **Exemplo:** Logo da Shopee -> Categoria: "Compras", Tipo: "expense".
  - **Exemplo:** Logo do Uber -> Categoria: "Transporte", Tipo: "expense".

✔ O nível de confiança da detecção deve ser usado internamente por você mas não deve ser exibido na resposta final. (Ex: [Logo detectado: iFood – confiança 0.92]).

---

### MÓDULO 3: EXTRAÇÃO AVANÇADA DE RECIBOS E NOTAS

Se a imagem **NÃO FOR UM BOLETO** e um logo não for claramente identificado, siga estas regras para extrair dados de recibos, tickets, faturas, notas fiscais ou anotações (mesmo que a foto esteja rasgada, amassada, com sombra, parcial ou tremida). Você reconstrói o máximo possível.

✔ **OCR Completo:** Analise a imagem para obter:
  - **description**: Nome do estabelecimento.
  - **amount**: Valor TOTAL da compra.
  - **date**: Data da transação (YYYY-MM-DD).
  - **type**: 'expense' (despesa) é o padrão.
  - **category**: A categoria mais apropriada. Use 'Outros' se não tiver certeza.
  - **cnpj**: CNPJ do estabelecimento.
  - **items**: Uma lista de todos os itens comprados, com 'name', 'quantity' e 'price'.

✔ **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico com base no formato usual de um comprovante.
  - Se o valor não for claro, mas houver uma descrição, extraia a descrição e defina o valor como 0.
  - Se a categoria não for clara, use 'Outros'.
  - Se o parcelamento não for mencionado, use 'one-time'.
✔ **Cálculo de Parcelas:** Se a imagem mostrar "10x de R$27,17", o valor a ser extraído é o TOTAL (271.70), 'paymentMethod' é 'installments' e 'installments' é "10".

---

**Sua Missão Final:**

1.  **Identifique o Tipo de Imagem:** Primeiro, determine se é um boleto, um comprovante com logo claro, ou outro tipo de recibo.
2.  **Aplique o Módulo Correto:** Use as regras do MÓDULO 1 para boletos, MÓDULO 2 para logos, ou MÓDULO 3 para os demais.
3.  **Use o Contexto:** Utilize o histórico de transações para refinar suas conclusões.
4.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado, mesmo que alguns campos sejam preenchidos com valores padrão devido a dados ausentes.

**Categorias Disponíveis para os Módulos 2 e 3:**
${transactionCategories.join('\n- ')}

---
**DADOS PARA ANÁLISE:**

**Histórico de Transações do Usuário (para contexto):**
${JSON.stringify(input.allTransactions || [])}

**Imagem para Análise:**
(A imagem está na próxima parte da mensagem)

Analise a imagem e o contexto, siga as regras e retorne um JSON válido.`;
    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: [
            { text: prompt },
            { media: { url: input.imageDataUri } }
        ],
        config: {
          retries: 3,
        },
        output: {
            format: 'json',
            schema: ExtractFromImageOutputSchema
        }
    });

    const output = result.output;
    if (!output || !output.description) {
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
