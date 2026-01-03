
import { z } from "zod";
import { icons } from 'lucide-react';

// Base category data (can be moved to a JSON or separate config if needed)
export const categoryData = {
  "Alimentação": ["Padaria", "Cafeteria", "Delivery", "Restaurante", "Supermercado"],
  "Assinaturas/Serviços": ["Jogos", "Aplicativos", "Streamings", "Telefone/Celular", "Televisão", "Internet"],
  "Moradia": ["Luz", "Eletrodomésticos", "Condomínio", "Aluguel/Prestação", "Reformas", "Água", "Casa"],
  "Transporte": ["IPVA", "Manutenção", "Táxi/Uber", "Licenciamento", "Combustível", "Multa"],
  "Saúde": ["Plano de Saúde", "Plano Odontológico", "Consultas", "Dentista", "Exames", "Farmácia"],
  "Lazer/Hobbies": ["Teatro", "Parques", "Bares", "Cinema", "Shows e Eventos", "Esportes", "Entretenimento", "Fitness"],
  "Dívidas/Empréstimos": ["Cartão de Crédito", "Empréstimo", "Cheque Especial", "Consórcio", "Empréstimo Consignado", "Encargos", "Financiamento"],
  "Educação": ["Cursos", "Faculdade", "Materiais e Livros", "Escola"],
  "Impostos/Taxas": ["Imposto de Renda", "Tarifa Bancária", "Anuidade Cartão", "Tributos"],
  "Investimentos e Reservas": ["Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Proventos", "Aplicação", "Rendimentos", "Retirada", "Juros"],
  "Bebê": ["Fraldas", "Fórmulas/Alimentação", "Roupas e Acessórios", "Saúde do Bebê", "Brinquedos/Educação"],
  "Pets": ["Banho/Tosa", "Acessórios Pet", "Alimentação Pet", "Medicamentos", "Veterinário", "Pet"],
  "Salário": ["Férias", "Hora extra", "Comissão", "13º Salário", "Aposentadoria", "Trabalho", "Bônus"],
  "Vestuário": ["Calçados", "Acessórios", "Roupas"],
  "Viagens": ["Hotel", "Passagem", "Passeio"],
  "Cuidado Pessoal": ["Higiene Pessoal", "Manicure", "Cabeleireiro/Barbeiro", "Maquiagem"],
  "Finanças": ["Renegociação", "Seguros"],
  "Outros": ["Presentes", "Compras", "Outros"],
} as const;

export const cardBrands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'other'] as const;
export const accountTypes = ['checking', 'savings', 'investment', 'other'] as const;

export type Category = keyof typeof categoryData;
export type Subcategory = typeof categoryData[Category][number];
export const transactionCategories = Object.values(categoryData).flat();
export type TransactionCategory = typeof transactionCategories[number];
export type CardBrand = typeof cardBrands[number];
export type AccountType = (typeof accountTypes)[number];

// Schemas & Types

const positiveNumberTransformer = z.any().transform((val, ctx) => {
    if (val === undefined || val === null || val === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor é obrigatório.",
        });
        return z.NEVER;
    }
    const parsed = parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser um número válido.",
        });
        return z.NEVER;
    }
    if (parsed <= 0) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O valor deve ser maior que zero.",
        });
        return z.NEVER;
    }
    return parsed;
});

export const TransactionFormSchema = z.object({
  description: z.string().min(2, {
    message: "A descrição deve ter pelo menos 2 caracteres.",
  }),
  amount: positiveNumberTransformer,
  date: z.date({required_error: "Por favor, selecione uma data."}),
  dueDate: z.date().optional(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories as [string, ...string[]], {
    errorMap: () => ({ message: "Por favor, selecione uma categoria." }),
  }),
  paid: z.boolean().default(true),
  creditCard: z.string().optional(),
  cardBrand: z.enum(cardBrands).optional(),
  institution: z.string().optional(),
  paymentMethod: z.enum(['one-time', 'installments', 'recurring', 'pix']).default('one-time'),
  installments: z.string().optional(),
  recurrence: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  observations: z.string().optional(),
  hideFromReports: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.paymentMethod === 'installments') {
        const installmentsNum = parseInt(data.installments || '0', 10);
        if (isNaN(installmentsNum) || installmentsNum < 2) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "O número de parcelas deve ser no mínimo 2.",
                path: ["installments"],
            });
        }
    }
    if (data.paymentMethod === 'recurring' && !data.recurrence) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A frequência da recorrência é obrigatória.",
            path: ["recurrence"],
        });
    }
});


export type Transaction = {
  id: string;
  ownerId: string;
  date: string; // Store as ISO string for serialization
  dueDate?: string; // Store as ISO string for serialization
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
  paid?: boolean;
  creditCard?: string;
  cardBrand?: CardBrand;
  institution?: string;
  paymentMethod?: 'one-time' | 'installments' | 'recurring' | 'pix';
  recurrence?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
  observations?: string;
  hideFromReports?: boolean;
};

// Types for File Extraction Flow
export const ExtractFromFileInputSchema = z.object({
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
    paymentMethod: z.enum(['one-time', 'installments', 'pix']).optional().describe("The payment method, if it can be inferred (e.g., from '10x de R$20')."),
    installments: z.string().optional().describe("The number of installments, if the payment is 'installments'."),
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;

export const ExtractFromFileOutputSchema = z.object({
  transactions: z.array(ExtractedTransactionSchema).describe('A list of transactions extracted from the file.'),
});
export type ExtractFromFileOutput = z.infer<typeof ExtractFromFileOutputSchema>;

// Types for Image Extraction Flow
export const ExtractFromImageInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of a receipt, invoice, or note, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  allTransactions: z.array(z.any()).optional().describe('A list of all financial transactions for context.'),
});
export type ExtractFromImageInput = z.infer<typeof ExtractFromImageInputSchema>;

export const ExtractFromImageOutputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories as [string, ...string[]]),
  date: z.string().optional().describe('Date in YYYY-MM-DD format. Infer if possible.'),
  paymentMethod: z.enum(['one-time', 'installments', 'pix']).optional(),
  installments: z.string().optional(),
  dueDate: z.string().optional().describe('Due date for the boleto in YYYY-MM-DD format.'),
  beneficiary: z.string().optional().describe('The beneficiary of the boleto.'),
  bank: z.string().optional().describe('The bank that issued the boleto.'),
  digitableLine: z.string().optional().describe('The full digitable line of the boleto.'),
  cnpj: z.string().optional().describe("The CNPJ of the establishment from a receipt."),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })).optional().describe("List of items from a receipt."),
});
export type ExtractFromImageOutput = z.infer<typeof ExtractFromImageOutputSchema>;


// Types for Budgeting
export const BudgetSchema = z.object({
  Supermercado: z.coerce.number().min(0).optional(),
  Casa: z.coerce.number().min(0).optional(),
  Pet: z.coerce.number().min(0).optional(),
  Farmácia: z.coerce.number().min(0).optional(),
  Restaurante: z.coerce.number().min(0).optional(),
  Entretenimento: z.coerce.number().min(0).optional(),
  Fitness: z.coerce.number().min(0).optional(),
  Educação: z.coerce.number().min(0).optional(),
  Outros: z.coerce.number().min(0).optional(),
});

export type Budget = z.infer<typeof BudgetSchema>;


// Types for Bank Accounts
export const AddAccountFormSchema = z.object({
  name: z.string().min(2, 'O nome da conta deve ter pelo menos 2 caracteres.'),
  type: z.enum(accountTypes, { required_error: 'Selecione um tipo de conta.' }),
  initialBalance: z.coerce.number().default(0),
});

export type Account = {
  id: string;
  ownerId: string;
  memberIds: string[];
  isShared: boolean;
  currentBalance: number;
  coupleId?: string;
} & z.infer<typeof AddAccountFormSchema>;

// Types for Investor Profile Analysis
export const InvestorProfileInputSchema = z.object({
  answers: z.record(z.string()).describe('Um objeto contendo as respostas do usuário, onde a chave é o ID da pergunta e o valor é o ID da resposta.'),
});
export type InvestorProfileInput = z.infer<typeof InvestorProfileInputSchema>;

export const InvestorProfileOutputSchema = z.object({
  profile: z.enum(['Conservador', 'Moderado', 'Arrojado']).describe('O perfil de investidor resultante (Conservador, Moderado ou Arrojado).'),
  analysis: z.string().describe('Uma análise textual detalhada (2-3 parágrafos) explicando o perfil, a tolerância ao risco e as implicações para a estratégia de investimento.'),
  assetAllocation: z.array(z.object({
    category: z.string().describe('A classe do ativo, ex: "RF Pós-Fixado", "Ações Brasil", "Fundos Imobiliários (FIIs)".'),
    percentage: z.number().describe('A porcentagem recomendada para alocar nesta classe de ativo. A soma de todas as porcentagens deve ser 100.'),
  })).describe('Uma lista de alocações de ativos recomendadas com suas respectivas porcentagens.'),
  recommendations: z.array(z.string()).describe('Uma lista de 2 a 3 recomendações ou próximos passos práticos para o investor.'),
  expectedReturn: z.string().describe('A rentabilidade anual projetada da carteira, no formato "IPCA + X,XX%".'),
});
export type InvestorProfileOutput = z.infer<typeof InvestorProfileOutputSchema>;

// Diagnostic Schema for AI
export const DiagnosticSchema = z.object({
  status: z.literal("erro"),
  etapa: z.string().describe("Descrição da etapa onde a falha ocorreu."),
  causa: z.string().describe("Causa provável do erro."),
  solucao: z.string().describe("Como corrigir o problema."),
  stack: z.string().optional().describe("Stack trace do erro, se aplicável.")
});

// Types for Lumina Chat Flow
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'partner', 'lumina', 'alerta']),
  text: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  authorPhotoUrl: z.string().optional(),
  transactionToConfirm: ExtractedTransactionSchema.optional().nullable(),
});

// Type for client-side state, which includes a JS Date object and an optional ID
export type ChatMessage = z.infer<typeof ChatMessageSchema> & {
    id?: string;
    timestamp: Date;
    audioUrl?: string;
    suggestions?: string[];
};

export const LuminaChatInputSchema = z.object({
  chatHistory: z.array(z.any()).optional(),
  userQuery: z.string().describe('The new message from the user.'),
  audioText: z.string().optional().describe('The transcribed text from an audio message.'),
  allTransactions: z.array(z.any()).describe('A list of all financial transactions for context.'),
  imageBase64: z.string().optional().nullable(),
  isCoupleMode: z.boolean().optional(),
  isTTSActive: z.boolean().optional().describe('Whether the user has text-to-speech enabled.'),
  user: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    photoURL: z.string().nullable(),
  }).optional(),
});
export type LuminaChatInput = z.infer<typeof LuminaChatInputSchema>;


// Type for App User data
export type AppUser = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    coupleId?: string | null;
    memberIds?: string[]; // NEW: list of userIds that are in the same couple (includes self)
    monthlyIncome?: number;
    // Parental Control
    isDependent?: boolean;
    parentUid?: string;
    dependents?: Record<string, { name: string, email: string }>;
};

// Couple Feature Types
export const LuminaCoupleChatInputSchema = LuminaChatInputSchema.extend({
  user: z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string().email().nullable(),
    photoURL: z.string().url().nullable(),
  }),
  partner: z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string().email().nullable(),
    photoURL: z.string().url().nullable(),
  }),
});
export type LuminaCoupleChatInput = z.infer<typeof LuminaCoupleChatInputSchema>;


export const LuminaChatOutputSchema = z.object({
  text: z.string().describe("The main textual response from Lumina."),
  suggestions: z.array(z.string()).describe("A list of suggested follow-up questions or actions."),
});
export type LuminaChatOutput = z.infer<typeof LuminaChatOutputSchema>;


export type CoupleLink = {
  id: string;
  members: string[];
  createdAt: any; // Firestore Timestamp
};


// Type for Couple data structure
export type Couple = {
  id: string;
  members: string[]; // array with two user IDs (enforced at server side)
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
};


// Types for User Status
export type UserStatus = {
    ultimoMesChecado?: string; // format MM/yy
    mesAlertadoRenda?: string; // format YYYY-MM
    mesAlertadoCasal?: string; // format YYYY-MM
    isDependent?: boolean;
};


// Types for Mediate Goals Flow
const GoalSchema = z.object({
  description: z.string().describe("Descrição da meta (ex: 'Viagem de luxo para a Europa')."),
  amount: z.number().positive().describe("Valor total necessário para a meta."),
  months: z.number().int().positive().describe("Prazo em meses para alcançar a meta."),
});

export const MediateGoalsInputSchema = z.object({
  partnerAGoal: GoalSchema.describe("O objetivo financeiro do Parceiro A."),
  partnerBGoal: GoalSchema.describe("O objetivo financeiro do Parceiro B."),
  sharedMonthlySavings: z.number().positive().describe("O valor total que o casal pode economizar por mês."),
  partnerAIncome: z.number().optional().describe("Renda mensal do parceiro A."),
  partnerBIncome: z.number().optional().describe("Renda mensal do parceiro B."),
  partnerAExpenses: z.number().optional().describe("Média de gastos mensais do parceiro A."),
  partnerBExpenses: z.number().optional().describe("Média de gastos mensais do parceiro B."),
  currentSavings: z.number().optional().describe("Poupança atual conjunta do casal."),
});
export type MediateGoalsInput = z.infer<typeof MediateGoalsInputSchema>;

const ActionStepSchema = z.object({
  title: z.string().describe("Um título curto para o passo de ação."),
  description: z.string().describe("Uma explicação detalhada do que precisa ser feito."),
});

export const MediateGoalsOutputSchema = z.object({
  summary: z.string().describe("Um resumo inspirador e neutro do plano conjunto, explicando como ele equilibra as duas metas."),
  jointPlan: z.object({
    partnerAPortion: z.number().describe("Valor mensal alocado para a meta do Parceiro A."),
    partnerBPortion: z.number().describe("Valor mensal alocado para a meta do Parceiro B."),
    unallocated: z.number().describe("Valor restante da economia mensal que não foi alocado."),
    partnerANewMonths: z.number().int().describe("O novo prazo em meses para a meta do Parceiro A com base na nova alocação."),
    partnerBNewMonths: z.number().int().describe("O novo prazo em meses para a meta do Parceiro B com base na nova alocação."),
  }),
  analysis: z.string().describe("Uma análise detalhada explicando a lógica por trás da sugestão, os prós e os contras do novo plano."),
  actionSteps: z.array(ActionStepSchema).describe("Uma lista de 2-3 passos práticos para o casal começar a seguir o plano."),
});
export type MediateGoalsOutput = z.infer<typeof MediateGoalsOutputSchema>;


// Types for Categorize Transaction Flow
export const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

export const CategorizeTransactionOutputSchema = z.object({
  category: z.enum(transactionCategories as [string, ...string[]]).describe('The predicted category of the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

// Types for Extract Transaction from Text Flow
export const ExtractTransactionInputSchema = z.object({
  text: z.string().describe('O texto em linguagem natural fornecido pelo usuário sobre uma transação.'),
});
export type ExtractTransactionInput = z.infer<typeof ExtractTransactionInputSchema>;

export const ExtractTransactionOutputSchema = ExtractedTransactionSchema;
export type ExtractTransactionOutput = z.infer<typeof ExtractTransactionOutputSchema>;


// Types for Multiple Transaction Extraction
export const ExtractMultipleTransactionsInputSchema = z.object({
  text: z.string().describe('Um bloco de texto onde cada linha é uma transação a ser processada.'),
});
export type ExtractMultipleTransactionsInput = z.infer<typeof ExtractMultipleTransactionsInputSchema>;

export const ExtractMultipleTransactionsOutputSchema = z.object({
  transactions: z.array(ExtractTransactionOutputSchema),
});
export type ExtractMultipleTransactionsOutput = z.infer<typeof ExtractMultipleTransactionsOutputSchema>;

// Genkit Types for Financial Analysis
const TrendAnalysisSchema = z.object({
  trendDescription: z.string().describe('Uma descrição textual da tendência de gastos do mês atual em comparação com a média dos últimos 3 meses.'),
  topChangingCategories: z.array(z.object({
    category: z.string().describe('A categoria de despesa.'),
    changePercentage: z.number().describe('A mudança percentual no gasto em comparação com a média.'),
    currentMonthSpending: z.number().describe('O gasto total na categoria no mês atual.'),
  })).describe('Uma lista das 3 categorias com as maiores mudanças percentuais (positivas ou negativas).')
}).optional();

export const GenerateFinancialAnalysisInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas).'),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

export const GenerateFinancialAnalysisOutputSchema = z.object({
  healthStatus: z.enum(['Saudável', 'Atenção', 'Crítico']).describe('A pontuação geral da saúde financeira do usuário.'),
  diagnosis: z.string().describe('Um diagnóstico textual curto e amigável sobre a saúde financeira do usuário, explicando o status.'),
  suggestions: z.array(z.string()).describe('Uma lista de 2 a 4 dicas de economia acionáveis e personalizadas com base nos gastos.'),
  trendAnalysis: TrendAnalysisSchema.describe('Uma análise das tendências de gastos do usuário ao longo do tempo.').optional(),
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;


export const SavingsGoalInputSchema = z.object({
  transactions: z.array(z.any()).describe('Lista de transações dos últimos 30-90 dias.'),
});
export type SavingsGoalInput = z.infer<typeof SavingsGoalInputSchema>;

export const SavingsGoalOutputSchema = z.object({
  monthlyIncome: z.number().describe('Renda mensal total calculada.'),
  currentExpenses: z.number().describe('Soma total dos gastos mensais.'),
  savingCapacity: z.number().describe('Capacidade real de economia (renda - gastos).'),
  recommendedGoal: z.number().describe('A meta de economia mensal recomendada em valor monetário.'),
  recommendedPercentage: z.number().describe('A porcentagem da renda que a meta recomendada representa.'),
});
export type SavingsGoalOutput = z.infer<typeof SavingsGoalOutputSchema>;


export const RecoveryProtocolInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas) do período a ser analisado.'),
  promptType: z.enum(['full', 'flash']).default('full'),
});
export type RecoveryProtocolInput = z.infer<typeof RecoveryProtocolInputSchema>;

export const RecoveryProtocolOutputSchema = z.object({
    inefficiencyPoint: z.string().describe("Análise objetiva dos pontos de ineficiência e desperdício."),
    missedDecisions: z.string().describe("Decisões estratégicas que não foram tomadas."),
    wastedOpportunities: z.string().describe("Oportunidades de otimização ou ganho que foram ignoradas."),
    highPerformerActions: z.string().describe("As ações imediatas (próximas 48h) que um indivíduo de alta performance executaria."),
    recoveryPlan: z.string().describe("O plano de ação mais curto e eficaz para garantir um resultado positivo no próximo mês."),
    warMantra: z.string().describe("Um mantra de guerra, objetivo e motivacional, para foco e execução."),
});
export type RecoveryProtocolOutput = z.infer<typeof RecoveryProtocolOutputSchema>;


export const FlashRecoveryOutputSchema = z.object({
    failureSummary: z.string().describe("Um resumo de 1 parágrafo sobre onde a falha ocorreu."),
    actionNow: z.string().describe("Um resumo de 1 parágrafo sobre o que deve ser feito imediatamente."),
    warMantra: z.string().describe("Um mantra de guerra, estilo ENTJ, para reprogramação mental."),
});
export type FlashRecoveryOutput = z.infer<typeof FlashRecoveryOutputSchema>;


export const brandNames: Record<CardBrand, string> = {
    mastercard: 'Mastercard',
    visa: 'Visa',
    elo: 'Elo',
    amex: 'American Express',
    hipercard: 'Hipercard',
    diners: 'Diners Club',
    other: 'Outra',
};

// Investment Category Sets
export const allInvestmentCategories = new Set(Object.values(categoryData["Investimentos e Reservas"]));
export const investmentApplicationCategories = new Set(["Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação"]);
export const investmentReturnCategories = new Set(["Proventos", "Rendimentos", "Juros"]);
export const investmentWithdrawalCategories = new Set(["Retirada"]);

export const institutions = [
    'Nubank', 'Bradesco', 'Itaú', 'Banco do Brasil', 'Caixa', 'Santander', 
    'Inter', 'BTG Pactual', 'XP Investimentos', 'Rico', 'Clear', 'Ágora',
    'Outro'
];


export const accountTypeLabels: Record<AccountType, string> = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    investment: 'Investimento',
    other: 'Outra',
};

export const iconNames = Object.keys(icons) as [string, ...string[]];

// Alexa Skill Schemas
export const AlexaExtractTransactionInputSchema = z.object({
    text: z.string().describe("Texto da fala do usuário vindo da Alexa."),
});
export const AlexaExtractTransactionOutputSchema = z.object({
    amount: z.number(),
    type: z.enum(["income", "expense"]),
    category: z.string(),
    description: z.string(),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
}).nullable();

export const GetSimpleFinancialSummaryInputSchema = z.object({
    totalIncome: z.number(),
    totalExpense: z.number(),
    balance: z.number(),
    period: z.enum(['today', 'month'])
});
export type GetSimpleFinancialSummaryInput = z.infer<typeof GetSimpleFinancialSummaryInputSchema>;

export const GetSimpleFinancialSummaryOutputSchema = z.object({
    summary: z.string().describe('O resumo financeiro em linguagem natural.'),
});
export type GetSimpleFinancialSummaryOutput = z.infer<typeof GetSimpleFinancialSummaryOutputSchema>;
