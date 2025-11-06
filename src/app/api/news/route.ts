
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

  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
    console.warn('Alpha Vantage API key is not configured.');
    // Return empty feed if key is missing, so the frontend doesn't show an error.
    return NextResponse.json({ feed: [] });
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
      // Don't throw an error, just log it and return empty.
      // This prevents the whole app from crashing if the external API is down.
      console.error(`Failed to fetch news from Alpha Vantage: ${response.statusText}`);
      return NextResponse.json({ error: `Server-side error fetching news: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();

    // Check for API limit messages, which are common with the free tier.
    if (data["Note"] || data["Information"]) {
        console.warn('Alpha Vantage API limit reached or info message returned:', data);
        // Return an empty feed to the client to gracefully hide the ticker.
        return NextResponse.json({ feed: [] });
    }
     if (data["Error Message"]) {
        console.error('Alpha Vantage API Error:', data["Error Message"]);
        return NextResponse.json({ error: data["Error Message"] }, { status: 400 });
     }


    // Cache the new data only if it's valid
    cachedNews = data;
    lastFetchTimestamp = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in news API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Server-side error fetching news: ${errorMessage}` }, { status: 500 });
  }
}
