
import { NextResponse } from 'next/server';

// This is a simplified in-memory cache. 
// For a production app, a more robust solution like Redis or a dedicated caching service would be better.
let cachedNews: any = null;
let lastFetchTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  // If we have cached data and it's not stale, return it.
  if (cachedNews && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
    return NextResponse.json(cachedNews);
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Alpha Vantage API key is not configured.' }, { status: 500 });
  }

  // Topics can be: blockchain, earnings, ipo, mergers_and_acquisitions, financial_markets,
  // economy_fiscal_policy, economy_monetary_policy, economy_macro, energy_transportation,
  // finance, life_sciences, manufacturing, real_estate, retail_wholesale, technology
  const topics = "financial_markets,economy_macro";
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'request', // Some APIs require a User-Agent header
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API error messages
    if (data["Note"] || data["Error Message"]) {
        console.warn('Alpha Vantage API limit or error:', data);
        return NextResponse.json({ error: 'Could not fetch news at this time. The API limit may have been reached.' }, { status: 429 });
    }

    // Cache the new data
    cachedNews = data;
    lastFetchTimestamp = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Alpha Vantage:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Server-side error fetching news: ${errorMessage}` }, { status: 500 });
  }
}
