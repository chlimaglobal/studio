import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction, TransactionCategory } from "./types";
import { startOfMonth, subMonths, differenceInCalendarMonths, parseISO } from 'date-fns';


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
        "Faculdade", "Escola"
    ]);

    const threeMonthsAgo = startOfMonth(subMonths(new Date(), 2));

    const relevantTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'expense' &&
               costOfLivingCategories.has(t.category) &&
               transactionDate >= threeMonthsAgo;
    });

    const totalEssentialExpenses = relevantTransactions.reduce((sum, t) => {
        const transactionAmount = parseFloat(String(t.amount));
        return isNaN(transactionAmount) ? sum : sum + transactionAmount;
    }, 0);
    
    // Always divide by 3 to get a true 3-month moving average.
    // If the user has less than 3 months of data, this will naturally be lower,
    // which is expected behavior for a moving average.
    return totalEssentialExpenses > 0 ? totalEssentialExpenses / 3 : 0;
}


export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}
