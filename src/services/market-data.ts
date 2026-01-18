

export type FinancialData = {
    selicRate: number;
    ipcaRate: number;
};

/**
 * Fetches current financial market data.
 * In a real application, this would call an external financial data API.
 * For this example, we're returning simulated but realistic static data.
 * @returns A promise that resolves to the financial data.
 */
export async function getFinancialMarketData(): Promise<FinancialData> {
    // Return realistic, hardcoded values
    return {
        selicRate: 10.50, // Example SELIC rate in percentage
        ipcaRate: 3.90,   // Example IPCA rate (last 12 months) in percentage
    };
}
