import { NextResponse } from 'next/server';

// Increase delay for stricter rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

// Add rate limiting state
let lastRequestTime = 0;

export async function GET(request: Request) {
  // Implement request throttling
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const category = searchParams.get('category');

  console.log('TE API Request:', { country, category });

  const baseUrl = 'https://api.tradingeconomics.com';
  const apiKey = process.env.TRADING_ECONOMICS_API_KEY;

  if (!apiKey) {
    console.error('Missing Trading Economics API key');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Free tier only has access to basic country indicators
    let endpoint = '';
    if (country) {
      // Basic country indicators endpoint
      endpoint = `/country/${encodeURIComponent(country.toLowerCase())}`;
    } else if (category) {
      // For categories, we'll use the general indicators endpoint
      const indicator = getCategoryIndicator(category);
      endpoint = `/country/all/${encodeURIComponent(indicator)}`;
    } else {
      return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    }

    const queryParams = new URLSearchParams({
      c: apiKey,
      format: 'json',
    });

    const response = await fetch(`${baseUrl}${endpoint}?${queryParams}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TE API Error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        error: errorText,
      });
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Add null check and handle empty data
    if (!data || !Array.isArray(data)) {
      console.warn('TE API Warning: No data returned or invalid format', { endpoint });
      return NextResponse.json({ data: [], warning: 'No data available' });
    }

    console.log('TE API Response:', { endpoint, dataLength: data.length });
    return NextResponse.json(data);
  } catch (error) {
    console.error('TE API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Simplified indicator mapping for free tier
function getCategoryIndicator(category: string): string {
  const categoryMap: Record<string, string> = {
    Groceries: 'Food Inflation',
    Transportation: 'Transport CPI',
    Housing: 'Housing Index',
    Healthcare: 'Healthcare Index',
    Entertainment: 'Consumer Spending',
    Clothing: 'Consumer Price Index',
    Electronics: 'Consumer Price Index',
    'Other Goods': 'Consumer Price Index',
  };

  const normalizedCategory = category.trim();
  return categoryMap[normalizedCategory] || 'Consumer Price Index';
}
