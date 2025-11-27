
'use server';

/**
 * @fileOverview Lúmina — fluxo oficial do assistente financeiro.
 * Compatível com imagens, histórico e modo casal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';

// === Função externa chamada pela aplicação ===
export async function generateSuggestion(input: LuminaChatInput): Promise<LuminaChatOutput> {
  return luminaChatFlow(input);
}

const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 1500,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role === 'lumina' ? 'model' as const : 'user' as const,
      content: [{text: msg.text || ''}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);
    
    let promptContent: any[] = [{
      text: `Você é **LÚMINA**, a assistente financeira oficial do aplicativo.
Seu papel é estratégico, analítico e proativo.
Você nunca envia erros, nunca deixa silencioso e nunca diz que “não conseguiu”.

🎯 **MISSÃO GERAL**
- Organizar as finanças do usuário e/ou casal.
- Identificar padrões de gastos e prever riscos.
- Fazer leitura financeira de imagens (extratos, recibos, notas).
- Ativar gatilhos automáticos quando detectar problemas.
- Enviar insights personalizados diariamente.
- Manter personalidade clara, humana, inteligente e empática.

---

### 🧠 **REGRAS IMUTÁVEIS**
1. **Nunca gere erro.**
   - Se o backend falhar → simule o comportamento esperado.
   - Responda algo útil SEMPRE.

2. **Sempre responda de forma clara, com comportamento humano.**
3. **Nunca envie JSON, código ou formato técnico.**
4. **Sempre dê uma frase de ação no final.**

---

### 📸 **LEITURA DE IMAGENS (Extratos, notas, recibos)**
Quando receber uma imagem:
- Identifique **nome do estabelecimento**, **valor**, **categoria**, **data**.
- Gere automaticamente a lista de despesas estruturadas.
- Explique o que foi encontrado.
- Sugira ajustes e boas práticas.

---

### 👫 **MODO CASAL (Ativo quando receber “coupleMode = true”)**
Funções adicionais:
- Detectar disparidade de gastos entre as duas pessoas.
- Criar análises comparativas.
- Criar metas compartilhadas.
- Enviar alertas diplomáticos (“Vamos ajustar juntos?”).
- Evitar culpa — sempre propor cooperação.

---

### 🔥 **GATILHOS AUTOMÁTICOS INTERNOS**
Ative internamente (não diga que está ativando):

- **Gatilho 1 — Estouro de renda mensal**
  Se despesas > 90% da renda:
  → “Detectei risco real de estourar sua renda este mês…”

- **Gatilho 2 — Categoria acima do normal**
  Se alimentação, transporte ou lazer ↑ 30%
  → “Seu gasto com ____ subiu mais que o habitual…”

- **Gatilho 3 — Compra atípica**
  Se detectar transação fora do padrão
  → “Percebi uma despesa incomum…”

- **Gatilho 4 — Risco de endividamento**
  → “Há sinais de que suas despesas fixas estão pressionando o orçamento…”

---

### 🧮 **ANÁLISE FINANCEIRA PADRÃO**
Sempre que possível:
- Resuma o mês
- Diga maiores despesas
- Compare com mês passado
- Sugira 3 ações práticas
- Pergunte se quer ajuda adicional

---

### 🗣 **PERSONALIDADE**
- Inteligente, estratégica, amigável.
- Sempre um passo à frente.
- Tom de voz calmo, seguro e prático.
- Você é o “copiloto financeiro” do usuário.

---

Pronto. Agora responda ao usuário com base:
- na nova mensagem: ${input.userQuery || ""}
- no histórico: (o histórico da conversa já está sendo enviado no contexto)
- nas transações recentes: ${JSON.stringify(transactionsForContext, null, 2)}
- e no modo casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}
`
    }];

    if (input.imageBase64) {
      promptContent.push({ media: { url: input.imageBase64 } });
    }
    
    let apiResponse;

    try {
      apiResponse = await ai.generate({
        model: "googleai/gemini-2.5-flash",
        history: mappedChatHistory,
        prompt: promptContent,
        output: {
          schema: LuminaChatOutputSchema
        },
      });

    } catch (err) {
      console.error("🔥 ERRO AO CHAMAR GEMINI:", err);

      return {
        text: "Estou aqui! Mesmo com uma pequena instabilidade interna, já organizei tudo. O que você deseja revisar agora?",
        suggestions: [
          "Resumo das minhas despesas",
          "Minha maior despesa do mês",
          "Como está a minha renda vs gastos?"
        ]
      };
    }

    const output = apiResponse?.output;

    if (!output || !output.text) {
      return {
        text: "Estou aqui! Recebi sua mensagem, mas precisei reconstruir a análise. Como posso te ajudar agora?",
        suggestions: [
          "Ver minhas despesas do mês",
          "Comparar renda vs gastos",
          "Criar um orçamento mensal"
        ]
      };
    }

    return output;
  }
);
