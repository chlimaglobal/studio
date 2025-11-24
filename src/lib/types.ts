import { z } from "zod";

export const categoryData = {
  "Alimentação": ["Padaria", "Cafeteria", "Delivery", "Restaurante", "Supermercado"],
  "Assinaturas/Serviços": ["Jogos", "Aplicativos", "Streamings", "Telefone/Celular", "Televisão", "Internet"],
  "Moradia": ["Luz", "Eletrodomésticos", "Condomínio", "Aluguel/Prestação", "Reformas", "Água", "Casa"],
  "Transporte": ["IPVA", "Manutenção", "Táxi/Uber", "Licenciamento", "Combustível", "Multa"],
  "Saúde": ["Plano de Saúde", "Plano Odontológico", "Consultas", "Dentista", "Exames", "Farmácia"],
  "Lazer/Hobbies": ["Teatro", "Parques", "Bares", "Cinema", "Shows e Eventos", "Esportes", "Entretenimento"],
  "Dívidas/Empréstimos": ["Cartão de Crédito", "Empréstimo", "Cheque Especial", "Consórcio", "Empréstimo Consignado", "Encargos"],
  "Educação": ["Cursos", "Faculdade", "Materiais e Livros", "Escola"],
  "Impostos/Taxas": ["Imposto de Renda", "Tarifa Bancária", "Anuidade Cartão", "Tributos"],
  "Investimentos e Reservas": ["Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Proventos", "Aplicação", "Rendimentos", "Retirada", "Juros"],
  "Bebê": ["Fraldas", "Fórmulas/Alimentação", "Roupas e Acessórios", "Saúde do Bebê", "Brinquedos/Educação"],
  "Pets": ["Banho/Tosa", "Acessórios Pet", "Alimentação Pet", "Medicamentos", "Veterinário", "Pet"],
  "Salário": ["Férias", "Hora extra", "Comissão", "13º Salário", "Aposentadoria", "Trabalho", "Bônus"],
  "Vestuário": ["Calçados", "Acessórios", "Roupas"],
  "Viagens": ["Hotel", "Passagem", "Passeio"],
  "Cuidado Pessoal": ["Higiene Pessoal", "Manicure", "Cabeleireiro/Barbeiro", "Maquiagem"],
  "Finanças": ["Financiamento", "Renegociação", "Seguros", "Fitness"],
  "Outros": ["Presentes", "Compras", "Outros"],
} as const;

export const cardBrands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'other'] as const;
export type CardBrand = typeof cardBrands[number];

export const brandNames: Record<CardBrand, string> = {
    mastercard: 'Mastercard',
    visa: 'Visa',
    elo: 'Elo',
    amex: 'American Express',
    hipercard: 'Hipercard',
    diners: 'Diners Club',
    other: 'Outra',
};


export type Category = keyof typeof categoryData;
export type Subcategory = typeof categoryData[Category][number];

// Flatten the structure to get a simple array of all categories/subcategories
export const transactionCategories = Object.values(categoryData).flat();

// Investment Category Sets
export const allInvestmentCategories = new Set(Object.values(categoryData["Investimentos e Reservas"]));
export const investmentApplicationCategories = new Set(["Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação"]);
export const investmentReturnCategories = new Set(["Proventos", "Rendimentos", "Juros"]);
export const investmentWithdrawalCategories = new Set(["Retirada"]);


export type TransactionCategory = typeof transactionCategories[number];

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
});
export type ExtractFromImageInput = z.infer<typeof ExtractFromImageInputSchema>;

export const ExtractFromImageOutputSchema = ExtractedTransactionSchema;
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
export const accountTypes = ['checking', 'savings', 'investment', 'other'] as const;
export type AccountType = (typeof accountTypes)[number];

export const accountTypeLabels: Record<AccountType, string> = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    investment: 'Investimento',
    other: 'Outra',
};

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
  coupleId?: string; // Optional field for linking couples
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
};

export const LuminaChatInputSchema = z.object({
  chatHistory: z.array(z.object({ // Can't use ChatMessageSchema because of the Date object
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).describe('The recent history of the conversation.'),
  userQuery: z.string().describe('The new message from the user.'),
  allTransactions: z.array(z.any()).describe('A list of all financial transactions for context.'),
});
export type LuminaChatInput = z.infer<typeof LuminaChatInputSchema>;


export const LuminaChatOutputSchema = z.string();
export type LuminaChatOutput = z.infer<typeof LuminaChatOutputSchema>;


export const LuminaCoupleChatInputSchema = z.object({
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).describe('The recent history of the conversation.'),
  userQuery: z.string().describe('The new message from the user.'),
  allTransactions: z.array(z.any()).describe('A list of all financial transactions for context.'),
  user: z.any().describe('The user object of the person sending the message.'),
  partner: z.any().describe('The user object of the partner.'),
});
export type LuminaCoupleChatInput = z.infer<typeof LuminaCoupleChatInputSchema>;


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

// Couple Feature Types
export type Partner = {
  uid: string;
  name: string;
  email: string;
  coupleId: string;
}

export type CoupleLink = {
  userA: string;
  userB: string;
  createdAt: any; // Firestore Timestamp
  status: 'active';
}

// Type for App User data
export type AppUser = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    coupleId?: string | null;
    monthlyIncome?: number;
};

// Type for Couple data structure
export type Couple = {
  id: string;
  members: [string, string]; // Array with exactly two user IDs
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
};


// Types for User Status
export type UserStatus = {
    ultimoMesChecado?: string; // format MM/yy
    mesAlertadoRenda?: string; // format YYYY-MM
    mesAlertadoCasal?: string; // format YYYY-MM
};
