
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

// Base Schemas
export const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

export const CategorizeTransactionOutputSchema = z.object({
  category: z.enum(transactionCategories).describe('The predicted category.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export const ExtractTransactionInputSchema = z.object({
  text: z.string().describe('The natural language text from the user about a transaction.'),
});
export type ExtractTransactionInput = z.infer<typeof ExtractTransactionInputSchema>;

export const ExtractTransactionOutputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories),
  paymentMethod: z.enum(['one-time', 'installments', 'pix']).optional(),
  installments: z.string().optional(),
});
export type ExtractTransactionOutput = z.infer<typeof ExtractTransactionOutputSchema>;

export const ExtractMultipleTransactionsInputSchema = z.object({
  text: z.string().describe('A block of text where each line is a transaction.'),
});
export const ExtractMultipleTransactionsOutputSchema = z.object({
  transactions: z.array(ExtractTransactionOutputSchema),
});
export type ExtractMultipleTransactionsInput = z.infer<typeof ExtractMultipleTransactionsInputSchema>;
export type ExtractMultipleTransactionsOutput = z.infer<typeof ExtractMultipleTransactionsOutputSchema>;

const TrendAnalysisSchema = z.object({
  trendDescription: z.string(),
  topChangingCategories: z.array(z.object({
    category: z.string(),
    changePercentage: z.number(),
    currentMonthSpending: z.number(),
  })).optional(),
}).optional();

export const GenerateFinancialAnalysisInputSchema = z.object({
  transactions: z.array(z.any()).describe('The list of user transactions.'),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

export const GenerateFinancialAnalysisOutputSchema = z.object({
  healthStatus: z.enum(['Saudável', 'Atenção', 'Crítico']),
  diagnosis: z.string(),
  suggestions: z.array(z.string()),
  trendAnalysis: TrendAnalysisSchema,
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;

export const ExtractFromFileInputSchema = z.object({
  fileContent: z.string(),
  fileName: z.string(),
});
export type ExtractFromFileInput = z.infer<typeof ExtractFromFileInputSchema>;

export const ExtractFromFileOutputSchema = z.object({
  transactions: z.array(ExtractTransactionOutputSchema),
});
export type ExtractFromFileOutput = z.infer<typeof ExtractFromFileOutputSchema>;

export const InvestorProfileInputSchema = z.object({
  answers: z.record(z.string()),
});
export type InvestorProfileInput = z.infer<typeof InvestorProfileInputSchema>;

export const InvestorProfileOutputSchema = z.object({
  profile: z.enum(['Conservador', 'Moderado', 'Arrojado']),
  analysis: z.string(),
  assetAllocation: z.array(z.object({ category: z.string(), percentage: z.number() })),
  recommendations: z.array(z.string()),
  expectedReturn: z.string(),
});
export type InvestorProfileOutput = z.infer<typeof InvestorProfileOutputSchema>;

export const SavingsGoalInputSchema = z.object({
  transactions: z.array(z.any()),
});
export type SavingsGoalInput = z.infer<typeof SavingsGoalInputSchema>;

export const SavingsGoalOutputSchema = z.object({
  monthlyIncome: z.number(),
  currentExpenses: z.number(),
  savingCapacity: z.number(),
  recommendedGoal: z.number(),
  recommendedPercentage: z.number(),
});
export type SavingsGoalOutput = z.infer<typeof SavingsGoalOutputSchema>;

const GoalSchema = z.object({
  description: z.string(),
  amount: z.number().positive(),
  months: z.number().int().positive(),
});
export const MediateGoalsInputSchema = z.object({
  partnerAGoal: GoalSchema,
  partnerBGoal: GoalSchema,
  sharedMonthlySavings: z.number().positive(),
  partnerAIncome: z.number().optional(),
  partnerBIncome: z.number().optional(),
  partnerAExpenses: z.number().optional(),
  partnerBExpenses: z.number().optional(),
  currentSavings: z.number().optional(),
});
export type MediateGoalsInput = z.infer<typeof MediateGoalsInputSchema>;

export const MediateGoalsOutputSchema = z.object({
  summary: z.string(),
  jointPlan: z.object({
    partnerAPortion: z.number(),
    partnerBPortion: z.number(),
    unallocated: z.number(),
    partnerANewMonths: z.number().int(),
    partnerBNewMonths: z.number().int(),
  }),
  analysis: z.string(),
  actionSteps: z.array(z.object({ title: z.string(), description: z.string() })),
});
export type MediateGoalsOutput = z.infer<typeof MediateGoalsOutputSchema>;

export const ExtractFromImageInputSchema = z.object({
  imageDataUri: z.string(),
  allTransactions: z.array(z.any()).optional(),
});
export type ExtractFromImageInput = z.infer<typeof ExtractFromImageInputSchema>;

export const ExtractFromImageOutputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories),
  date: z.string().optional(),
  paymentMethod: z.enum(['one-time', 'installments', 'pix']).optional(),
  installments: z.string().optional(),
  dueDate: z.string().optional(),
  beneficiary: z.string().optional(),
  bank: z.string().optional(),
  digitableLine: z.string().optional(),
  cnpj: z.string().optional(),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), price: z.number() })).optional(),
});
export type ExtractFromImageOutput = z.infer<typeof ExtractFromImageOutputSchema>;

export const LuminaChatInputSchema = z.object({
  chatHistory: z.array(z.any()).optional(),
  userQuery: z.string(),
  audioText: z.string().optional(),
  allTransactions: z.array(z.any()),
  imageBase64: z.string().optional().nullable(),
  isCoupleMode: z.boolean().optional(),
  isTTSActive: z.boolean().optional(),
  user: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    photoURL: z.string().nullable(),
  }).optional(),
});
export type LuminaChatInput = z.infer<typeof LuminaChatInputSchema>;
export const LuminaCoupleChatInputSchema = LuminaChatInputSchema.extend({
  partner: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    photoURL: z.string().nullable(),
  }),
});
export const LuminaChatOutputSchema = z.object({
  text: z.string(),
  suggestions: z.array(z.string()),
});
export type LuminaChatOutput = z.infer<typeof LuminaChatOutputSchema>;

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

// Types for Card management
export const AddCardFormSchema = z.object({
  name: z.string().min(2, 'O apelido deve ter pelo menos 2 caracteres.'),
  brand: z.enum(cardBrands, { required_error: 'Selecione a bandeira do cartão.' }),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
});
export type Card = z.infer<typeof AddCardFormSchema> & { id: string };

// Types for Goals
export const AddGoalFormSchema = z.object({
  name: z.string().min(2, "O nome da meta deve ter pelo menos 2 caracteres."),
  targetAmount: z.union([z.string(), z.number()]).transform((val) => Number(String(val).replace('.', '').replace(',', '.'))),
  currentAmount: z.union([z.string(), z.number()]).transform((val) => Number(String(val).replace('.', '').replace(',', '.'))),
  deadline: z.date({ required_error: "Por favor, selecione um prazo." }),
  icon: z.enum(iconNames, { required_error: "Por favor, selecione um ícone." }),
});

export const EditGoalFormSchema = AddGoalFormSchema;

export type Goal = {
  id: string;
} & z.infer<typeof AddGoalFormSchema>;


// Types for Commissions
export const AddCommissionFormSchema = z.object({
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres."),
  amount: positiveNumberTransformer,
  client: z.string().optional(),
  date: z.date({ required_error: "Por favor, selecione uma data." }),
  status: z.enum(['pending', 'received']),
});

export const EditCommissionFormSchema = z.object({
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres."),
  amount: z.string().min(1, "O valor é obrigatório."),
  client: z.string().optional(),
  date: z.date({ required_error: "Por favor, selecione uma data." }),
});

export type Commission = {
  id: string;
} & z.infer<typeof AddCommissionFormSchema>;

export type NotificationSettings = {
    dailySummary: boolean;
    futureIncome: boolean;
    futurePayments: boolean;
    sync: boolean;
    promos: boolean;
    goalsMet: boolean;
    spendingLimits: boolean;
    goalReminders: boolean;
    spendingReminders: boolean;
    invoiceDue: boolean;
    invoiceClosed: boolean;
};

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
