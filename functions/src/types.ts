
import { z } from 'zod';

export const transactionCategories = [
    "Alimentação", "Assinaturas/Serviços", "Moradia", "Transporte", "Saúde", 
    "Lazer/Hobbies", "Dívidas/Empréstimos", "Educação", "Impostos/Taxas", 
    "Investimentos e Reservas", "Bebê", "Pets", "Salário", "Vestuário", 
    "Viagens", "Cuidado Pessoal", "Finanças", "Outros",
    "Padaria", "Cafeteria", "Delivery", "Restaurante", "Supermercado", 
    "Jogos", "Aplicativos", "Streamings", "Telefone/Celular", "Televisão", "Internet",
    "Luz", "Eletrodomésticos", "Condomínio", "Aluguel/Prestação", "Reformas", "Água", "Casa",
    "IPVA", "Manutenção", "Táxi/Uber", "Licenciamento", "Combustível", "Multa",
    "Plano de Saúde", "Plano Odontológico", "Consultas", "Dentista", "Exames", "Farmácia",
    "Teatro", "Parques", "Bares", "Cinema", "Shows e Eventos", "Esportes", "Entretenimento", "Fitness",
    "Cartão de Crédito", "Empréstimo", "Cheque Especial", "Consórcio", "Empréstimo Consignado", "Encargos",
    "Cursos", "Faculdade", "Materiais e Livros", "Escola",
    "Imposto de Renda", "Tarifa Bancária", "Anuidade Cartão", "Tributos",
    "Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Proventos", "Aplicação", "Rendimentos", "Retirada", "Juros",
    "Fraldas", "Fórmulas/Alimentação", "Roupas e Acessórios", "Saúde do Bebê", "Brinquedos/Educação",
    "Banho/Tosa", "Acessórios Pet", "Alimentação Pet", "Medicamentos", "Veterinário",
    "Férias", "Hora extra", "Comissão", "13º Salário", "Aposentadoria", "Trabalho", "Bônus",
    "Calçados", "Acessórios", "Roupas",
    "Hotel", "Passagem", "Passeio",
    "Higiene Pessoal", "Manicure", "Cabeleireiro/Barbeiro", "Maquiagem",
    "Renegociação", "Seguros",
    "Presentes", "Compras"
] as const;

// Base Schemas
export const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export const CategorizeTransactionOutputSchema = z.object({
  category: z.enum(transactionCategories).describe('The predicted category.'),
});

export const ExtractTransactionInputSchema = z.object({
  text: z.string().describe('The natural language text from the user about a transaction.'),
});
export const ExtractTransactionOutputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories),
  paymentMethod: z.enum(['one-time', 'installments', 'pix']).optional(),
  installments: z.string().optional(),
});

export const ExtractMultipleTransactionsInputSchema = z.object({
  text: z.string().describe('A block of text where each line is a transaction.'),
});
export const ExtractMultipleTransactionsOutputSchema = z.object({
  transactions: z.array(ExtractTransactionOutputSchema),
});


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
export const GenerateFinancialAnalysisOutputSchema = z.object({
  healthStatus: z.enum(['Saudável', 'Atenção', 'Crítico']),
  diagnosis: z.string(),
  suggestions: z.array(z.string()),
  trendAnalysis: TrendAnalysisSchema,
});


export const ExtractFromFileInputSchema = z.object({
  fileContent: z.string(),
  fileName: z.string(),
});
export const ExtractFromFileOutputSchema = z.object({
  transactions: z.array(ExtractTransactionOutputSchema),
});

export const InvestorProfileInputSchema = z.object({
  answers: z.record(z.string()),
});
export const InvestorProfileOutputSchema = z.object({
  profile: z.enum(['Conservador', 'Moderado', 'Arrojado']),
  analysis: z.string(),
  assetAllocation: z.array(z.object({ category: z.string(), percentage: z.number() })),
  recommendations: z.array(z.string()),
  expectedReturn: z.string(),
});

export const SavingsGoalInputSchema = z.object({
  transactions: z.array(z.any()),
});
export const SavingsGoalOutputSchema = z.object({
  monthlyIncome: z.number(),
  currentExpenses: z.number(),
  savingCapacity: z.number(),
  recommendedGoal: z.number(),
  recommendedPercentage: z.number(),
});

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

export const ExtractFromImageInputSchema = z.object({
  imageDataUri: z.string(),
  allTransactions: z.array(z.any()).optional(),
});
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
