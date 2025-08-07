
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
  "Pets": ["Banho/Tosa", "Acessórios Pet", "Alimentação Pet", "Medicamentos", "Veterinário", "Pet"],
  "Salário": ["Férias", "Hora extra", "Comissão", "13º Salário", "Aposentadoria", "Trabalho", "Bônus"],
  "Vestuário": ["Calçados", "Acessórios", "Roupas"],
  "Viagens": ["Hotel", "Passagem", "Passeio"],
  "Cuidado Pessoal": ["Higiene Pessoal", "Manicure", "Cabeleireiro/Barbeiro", "Maagem"],
  "Finanças": ["Financiamento", "Renegociação", "Seguros", "Fitness"],
  "Outros": ["Presentes", "Compras", "Outros"],
} as const;


export type Category = keyof typeof categoryData;
export type Subcategory = typeof categoryData[Category][number];

// Flatten the structure to get a simple array of all categories/subcategories
export const transactionCategories = Object.values(categoryData).flat();
export const allInvestmentCategories = new Set(Object.values(categoryData["Investimentos e Reservas"]));


export type TransactionCategory = typeof transactionCategories[number];


export const TransactionFormSchema = z.object({
  description: z.string().min(2, {
    message: "A descrição deve ter pelo menos 2 caracteres.",
  }),
  amount: z.union([z.string(), z.number()])
    .transform((val, ctx) => {
        if (typeof val === 'number') return val;
        // Clean the string: remove thousand separators (.) and then replace comma (,) with a dot (.)
        const cleanedVal = val.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleanedVal);
        if (isNaN(parsed)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "O valor deve ser um número válido.",
            });
            return z.NEVER;
        }
        return parsed;
    })
    .refine((val) => val > 0, {
        message: "O valor deve ser um número positivo."
    }),
  date: z.date({required_error: "Por favor, selecione uma data."}),
  type: z.enum(['income', 'expense']),
  category: z.enum(transactionCategories as [string, ...string[]], {
    errorMap: () => ({ message: "Por favor, selecione uma categoria." }),
  }),
  paid: z.boolean().default(true),
  creditCard: z.string().optional(),
  paymentMethod: z.enum(['one-time', 'installments', 'recurring']).optional().default('one-time'),
  installments: z.coerce.number().int().min(2, "O número de parcelas deve ser pelo menos 2.").optional().or(z.literal('')),
  recurrence: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  observations: z.string().optional(),
  hideFromReports: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.type === 'expense' && data.category === 'Cartão de Crédito' && (!data.creditCard || data.creditCard.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O nome do cartão é obrigatório para a categoria 'Cartão de Crédito'.",
            path: ["creditCard"],
        });
    }
    if (data.paymentMethod === 'installments' && (!data.installments || data.installments < 2)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O número de parcelas é obrigatório e deve ser no mínimo 2.",
            path: ["installments"],
        });
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
  date: string; // Store as ISO string for serialization
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
  paid?: boolean;
  creditCard?: string;
  paymentMethod?: 'one-time' | 'installments' | 'recurring';
  installments?: number;
  recurrence?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  installmentNumber?: number;
  totalInstallments?: number;
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
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>;

export const ExtractFromFileOutputSchema = z.object({
  transactions: z.array(ExtractedTransactionSchema).describe('A list of transactions extracted from the file.'),
});
export type ExtractFromFileOutput = z.infer<typeof ExtractFromFileOutputSchema>;


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

    