
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction, TransactionCategory } from "./types";
import { startOfMonth, subMonths } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
};

// Helper function to convert ArrayBuffer to Base64URL string
export function bufferToBase64Url(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Helper function to convert Base64URL string to ArrayBuffer
export function base64UrlToBuffer(base64Url: string): ArrayBuffer {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
}


/**
 * Calculates the moving average cost of living based on essential expense categories over the last 3 months.
 * @param transactions - An array of all user transactions.
 * @returns The average monthly cost of living.
 */
export function calculateMovingAverageCostOfLiving(transactions: Transaction[]): number {
    const costOfLivingCategories = new Set<TransactionCategory>([
        "Luz", "Condomínio", "Aluguel/Prestação", "Água", "Casa", "Supermercado",
        "Internet", "Telefone/Celular", "Plano de Saúde", "Plano Odontológico", 
        "Farmácia", "IPVA", "Manutenção", "Combustível", "Licenciamento", 
        "Faculdade", "Escola", "Financiamento", "Empréstimo", "Seguros"
    ]);

    const threeMonthsAgo = startOfMonth(subMonths(new Date(), 2));

    const relevantTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'expense' &&
               costOfLivingCategories.has(t.category) &&
               transactionDate >= threeMonthsAgo;
    });
    
    const monthlyCosts = new Map<string, number>();
    relevantTransactions.forEach(t => {
        const monthKey = t.date.substring(0, 7); // "YYYY-MM"
        
        // 🛠️ CORREÇÃO PRINCIPAL: Garante que t.amount é um número válido.
        // 1. Converte o valor da transação (que pode ser String do Firebase) para float.
        const transactionAmount = parseFloat(String(t.amount)); 
        
        // 2. Se a conversão resultar em NaN (valor inválido ou mal formatado), a transação é ignorada.
        if (isNaN(transactionAmount)) {
            // Opcional: Adicione um log para debugging, se necessário.
            // console.error(`Valor de transação inválido ignorado: ${t.amount}`);
            return; 
        }

        const currentTotal = monthlyCosts.get(monthKey) || 0;
        
        // A soma agora é segura e numérica
        monthlyCosts.set(monthKey, currentTotal + transactionAmount);
    });

    const totalEssentialExpenses = Array.from(monthlyCosts.values()).reduce((sum, cost) => sum + cost, 0);
    const numberOfMonthsWithExpenses = monthlyCosts.size;

    // 🛠️ CORREÇÃO SECUNDÁRIA: Cláusula de Guarda contra a divisão por zero (0/0)
    if (numberOfMonthsWithExpenses > 0) {
        return totalEssentialExpenses / numberOfMonthsWithExpenses;
    } else {
        return 0;
    }
}
