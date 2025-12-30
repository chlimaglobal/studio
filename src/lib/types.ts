
import { z } from "zod";
import {
    TransactionFormSchema,
    ExtractedTransactionSchema,
    ExtractFromFileInputSchema,
    ExtractFromFileOutputSchema,
    ExtractFromImageInputSchema,
    ExtractFromImageOutputSchema,
    BudgetSchema,
    AddAccountFormSchema,
    InvestorProfileInputSchema,
    InvestorProfileOutputSchema,
    ChatMessageSchema,
    LuminaChatInputSchema,
    LuminaCoupleChatInputSchema,
    LuminaChatOutputSchema,
    MediateGoalsInputSchema,
    MediateGoalsOutputSchema,
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    ExtractTransactionInputSchema,
    ExtractTransactionOutputSchema,
    ExtractMultipleTransactionsInputSchema,
    ExtractMultipleTransactionsOutputSchema,
    SavingsGoalInputSchema,
    SavingsGoalOutputSchema,
    RecoveryProtocolInputSchema,
    FlashRecoveryOutputSchema,
    RecoveryProtocolOutputSchema
} from './definitions';
import type {
    Transaction,
    Category,
    Subcategory,
    TransactionCategory,
    CardBrand,
    ExtractedTransaction,
    ExtractFromFileInput,
    ExtractFromFileOutput,
    ExtractFromImageInput,
    ExtractFromImageOutput,
    Budget,
    AccountType,
    Account,
    InvestorProfileInput,
    InvestorProfileOutput,
    ChatMessage,
    LuminaChatInput,
    LuminaCoupleChatInput,
    LuminaChatOutput,
    AppUser,
    CoupleLink,
    Couple,
    UserStatus,
    MediateGoalsInput,
    MediateGoalsOutput,
    CategorizeTransactionInput,
    CategorizeTransactionOutput,
    ExtractTransactionInput,
    ExtractTransactionOutput,
    ExtractMultipleTransactionsInput,
    ExtractMultipleTransactionsOutput,
    SavingsGoalInput,
    SavingsGoalOutput,
    RecoveryProtocolInput,
    FlashRecoveryOutput,
    RecoveryProtocolOutput
} from './definitions';


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

export const brandNames: Record<CardBrand, string> = {
    mastercard: 'Mastercard',
    visa: 'Visa',
    elo: 'Elo',
    amex: 'American Express',
    hipercard: 'Hipercard',
    diners: 'Diners Club',
    other: 'Outra',
};

// Flatten the structure to get a simple array of all categories/subcategories
export const transactionCategories = Object.values(categoryData).flat();

// Investment Category Sets
export const allInvestmentCategories = new Set(Object.values(categoryData["Investimentos e Reservas"]));
export const investmentApplicationCategories = new Set(["Reserva de Emergência", "Ações", "Fundos Imobiliários", "Renda Fixa", "Aplicação"]);
export const investmentReturnCategories = new Set(["Proventos", "Rendimentos", "Juros"]);
export const investmentWithdrawalCategories = new Set(["Retirada"]);

export const accountTypes = ['checking', 'savings', 'investment', 'other'] as const;

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


export {
    TransactionFormSchema,
    ExtractedTransactionSchema,
    ExtractFromFileInputSchema,
    ExtractFromFileOutputSchema,
    ExtractFromImageInputSchema,
    ExtractFromImageOutputSchema,
    BudgetSchema,
    AddAccountFormSchema,
    InvestorProfileInputSchema,
    InvestorProfileOutputSchema,
    ChatMessageSchema,
    LuminaChatInputSchema,
    LuminaCoupleChatInputSchema,
    LuminaChatOutputSchema,
    MediateGoalsInputSchema,
    MediateGoalsOutputSchema,
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    ExtractTransactionInputSchema,
    ExtractTransactionOutputSchema,
    ExtractMultipleTransactionsInputSchema,
    ExtractMultipleTransactionsOutputSchema,
    SavingsGoalInputSchema,
    SavingsGoalOutputSchema,
    RecoveryProtocolInputSchema,
    FlashRecoveryOutputSchema,
    RecoveryProtocolOutputSchema
}

export type {
    Transaction,
    Category,
    Subcategory,
    TransactionCategory,
    CardBrand,
    ExtractedTransaction,
    ExtractFromFileInput,
    ExtractFromFileOutput,
    ExtractFromImageInput,
    ExtractFromImageOutput,
    Budget,
    AccountType,
    Account,
    InvestorProfileInput,
    InvestorProfileOutput,
    ChatMessage,
    LuminaChatInput,
    LuminaCoupleChatInput,
    LuminaChatOutput,
    AppUser,
    CoupleLink,
    Couple,
    UserStatus,
    MediateGoalsInput,
    MediateGoalsOutput,
    CategorizeTransactionInput,
    CategorizeTransactionOutput,
    ExtractTransactionInput,
    ExtractTransactionOutput,
    ExtractMultipleTransactionsInput,
    ExtractMultipleTransactionsOutput,
    SavingsGoalInput,
    SavingsGoalOutput,
    RecoveryProtocolInput,
    FlashRecoveryOutput,
    RecoveryProtocolOutput
};
