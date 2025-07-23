
import { z } from "zod";

export const categoryData = {
  "Alimentação": ["Padaria", "Cafeteria", "Delivery", "Restaurante", "Supermercado"],
  "Assinaturas/Serviços": ["Jogos", "Aplicativos", "Streamings", "Telefone/Celular", "Televisão", "Internet"],
  "Moradia": ["Luz", "Eletrodomésticos", "Condomínio", "Aluguel/Prestação", "Reformas", "Água"],
  "Transporte": ["IPVA", "Manutenção", "Táxi/Uber", "Licenciamento", "Combustível", "Multa"],
  "Saúde": ["Plano de Saúde", "Plano Odontológico", "Consultas", "Dentista", "Exames", "Farmácia"],
  "Lazer/Hobbies": ["Teatro", "Parques", "Bares", "Cinema", "Shows e Eventos", "Esportes"],
  "Dívidas/Empréstimos": ["Empréstimo", "Cartão de Crédito", "Cheque Especial", "Consórcio", "Empréstimo Consignado", "Encargos"],
  "Educação": ["Cursos", "Faculdade", "Materiais e Livros", "Escola"],
  "Impostos/Taxas": ["Imposto de Renda", "Tarifa Bancária", "Anuidade Cartão", "Tributos"],
  "Investimentos": ["Juros", "Proventos", "Aplicação", "Rendimentos", "Retirada"],
  "Pets": ["Banho/Tosa", "Acessórios Pet", "Alimentação Pet", "Medicamentos", "Veterinário"],
  "Salário": ["Férias", "Hora extra", "Comissão", "13º Salário", "Aposentadoria", "Trabalho", "Bônus"],
  "Vestuário": ["Calçados", "Acessórios", "Roupas"],
  "Viagens": ["Hotel", "Passagem", "Passeio"],
  "Cuidado Pessoal": ["Higiene Pessoal", "Manicure", "Cabeleireiro/Barbeiro", "Maquiagem"],
  "Finanças": ["Financiamento", "Renegociação", "Seguros"],
  "Outros": ["Presentes", "Compras"],
} as const;


export type Category = keyof typeof categoryData;
export type Subcategory = typeof categoryData[Category][number];

// Flatten the structure to get a simple array of all categories/subcategories
export const transactionCategories = Object.values(categoryData).flat();

export type TransactionCategory = typeof transactionCategories[number];


export const TransactionFormSchema = z.object({
  description: z.string().min(2, {
    message: "A descrição deve ter pelo menos 2 caracteres.",
  }),
  amount: z.coerce.number({invalid_type_error: "Por favor, insira um valor válido."}).positive({ message: "O valor deve ser um número positivo." }),
  date: z.date({required_error: "Por favor, selecione uma data."}),
  type: z.enum(['income', 'expense']),
  paymentType: z.string().optional(),
  receivedFrom: z.string().optional(),
  category: z.enum(transactionCategories as [string, ...string[]], {
    errorMap: () => ({ message: "Por favor, selecione uma categoria." }),
  }),
  paid: z.boolean().default(false),
  creditCard: z.string().optional(),
}).refine(data => {
    if (data.category === 'Cartão de Crédito' && (!data.creditCard || data.creditCard.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "O nome do cartão é obrigatório para esta categoria.",
    path: ["creditCard"],
});


export type Transaction = {
  id: string;
  date: string; // Store as ISO string for serialization
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
  paymentType?: string;
  receivedFrom?: string;
  paid?: boolean;
  creditCard?: string;
};
