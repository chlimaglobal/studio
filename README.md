
# FinanceFlow - Protótipo do Firebase Studio

Bem-vindo ao FinanceFlow! Este é um protótipo de um aplicativo de finanças pessoais e para casais, construído com Next.js, Firebase e a assistente de IA Lúmina.

## Finalidade do Projeto

O FinanceFlow foi projetado para ajudar usuários a obter clareza e controle sobre sua vida financeira. Ele automatiza tarefas, fornece insights proativos e facilita o gerenciamento financeiro, seja individualmente ou em casal.

---

## Como Fazer o Deploy das Cloud Functions (Ex: Alexa)

Como este projeto está no ambiente online do Firebase Studio, você não pode executar o comando `firebase deploy` diretamente aqui. Para implantar as Cloud Functions, você precisará recriar a pasta `functions` no seu computador.

**Siga este passo a passo:**

### 1. Prepare o Ambiente no seu Computador

*   **Crie uma Pasta Principal:** Em algum lugar do seu computador, crie uma pasta para o projeto. Ex: `C:\Projetos\FinanceFlow`.
*   **Instale as Ferramentas:** Se ainda não tiver, instale a versão **20 ou superior** do [Node.js](https://nodejs.org/) e o **[Firebase CLI](https://firebase.google.com/docs/cli#install_the_cli)**.
*   **Faça Login no Firebase:** Abra o terminal e execute `firebase login`.

### 2. Recrie a Estrutura da Pasta `functions`

Dentro da sua pasta `FinanceFlow`, crie a seguinte estrutura de pastas e arquivos. Você pode copiar o conteúdo de cada arquivo diretamente do editor do Firebase Studio.

```
FinanceFlow/
└── functions/
    ├── src/
    │   ├── alexa.ts
    │   ├── index.ts
    │   ├── types.ts
    │   ├── services/
    │   │   └── market-data.ts
    │   └── prompts/
    │       ├── luminaBasePrompt.ts
    │       ├── luminaCouplePrompt.ts
    │       └── luminaGoalsPrompt.ts
    ├── package.json
    └── tsconfig.json
```

**Importante:** Copie o conteúdo exato de cada um desses arquivos do Firebase Studio e cole nos arquivos correspondentes que você criou no seu computador.

### 3. Instale as Dependências e Faça o Deploy

*   **Abra o Terminal na Pasta `functions`:** Use o comando `cd` para navegar até a pasta `functions` que você criou.
    ```bash
    cd C:\Projetos\FinanceFlow\functions
    ```
*   **Instale as Dependências das Functions:**
    ```bash
    npm install
    ```
*   **Volte para a Pasta Raiz:** Agora, volte para a pasta principal do projeto.
    ```bash
    cd ..
    ```
*   **Execute o Deploy:** A partir da pasta raiz, execute o comando:
    ```bash
    firebase deploy --only functions
    ```

Ao final, o terminal mostrará a URL da sua função da Alexa. É essa URL que você usará na configuração da sua Skill na Amazon.
