import { Redis } from '@upstash/redis';
import { AVAILABLE_CATEGORIES } from './calculations';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Consolidated unique indicators
const CORE_INDICATORS = {
  PRICE_INDICES: [
    'Core Inflation Rate',
    'Consumer Price Index',
    'Producer Prices',
    'Import Prices',
  ],
  CONSUMER_METRICS: ['Consumer Spending', 'Retail Sales MoM'],
  SECTOR_SPECIFIC: {
    'Groceries & Food': ['Food Inflation', 'Consumer Price Index Food'],
    Transportation: ['Transportation Costs', 'Gasoline Prices'],
    'Housing & Utilities': ['Housing Index', 'Construction Costs'],
    Healthcare: ['Healthcare Spending', 'Government Spending'],
  },
} as const;

// Mapping categories to their indicator groups
const CATEGORY_INDICATOR_GROUPS: Record<string, (keyof typeof CORE_INDICATORS)[]> = {
  'Groceries & Food': ['PRICE_INDICES', 'SECTOR_SPECIFIC'],
  Transportation: ['PRICE_INDICES', 'SECTOR_SPECIFIC'],
  'Housing & Utilities': ['PRICE_INDICES', 'SECTOR_SPECIFIC'],
  Healthcare: ['PRICE_INDICES', 'SECTOR_SPECIFIC'],
  Entertainment: ['PRICE_INDICES', 'CONSUMER_METRICS'],
  Clothing: ['PRICE_INDICES', 'CONSUMER_METRICS'],
  Electronics: ['PRICE_INDICES', 'CONSUMER_METRICS'],
  'Other Goods': ['PRICE_INDICES', 'CONSUMER_METRICS'],
};

const COUNTRIES = ['Mexico', 'Canada', 'China'] as const;
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

interface TradeItem {
  name: string;
  basePrice: number;
  importShare: number;
  explanation: string;
  lastUpdated: string;
}

interface IndicatorData {
  Country?: string;
  Category?: string;
  Value?: number;
  LastUpdate?: string;
}

// Get all unique indicators for a country
function getUniqueIndicators(): string[] {
  const uniqueIndicators = new Set<string>();

  // Add core indicators
  Object.values(CORE_INDICATORS).forEach((group) => {
    if (Array.isArray(group)) {
      group.forEach((indicator) => uniqueIndicators.add(indicator));
    } else {
      Object.values(group)
        .flat()
        .forEach((indicator) => uniqueIndicators.add(indicator));
    }
  });

  return Array.from(uniqueIndicators);
}

async function fetchIndicatorData(country: string): Promise<IndicatorData[]> {
  try {
    const indicators = getUniqueIndicators();
    console.log(`Fetching ${indicators.length} indicators for ${country}`);

    const response = await fetch(
      `https://api.tradingeconomics.com/country/${encodeURIComponent(country.toLowerCase())}?c=${process.env.TRADING_ECONOMICS_API_KEY}&indicators=${indicators.join(',')}`
    );

    if (!response.ok) {
      console.error(`Error fetching data for ${country}:`, response.statusText);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching indicator data for ${country}:`, error);
    return [];
  }
}

// Get relevant indicators for a category
function getCategoryIndicators(category: string, allData: IndicatorData[]): IndicatorData[] {
  const relevantGroups = CATEGORY_INDICATOR_GROUPS[category];
  if (!relevantGroups) return [];

  const relevantIndicators = new Set<string>();

  // Add indicators from relevant groups
  relevantGroups.forEach((group) => {
    const indicators = CORE_INDICATORS[group];
    if (Array.isArray(indicators)) {
      indicators.forEach((indicator: string) => relevantIndicators.add(indicator));
    } else if (group === 'SECTOR_SPECIFIC' && category in CORE_INDICATORS.SECTOR_SPECIFIC) {
      (
        CORE_INDICATORS.SECTOR_SPECIFIC[category as keyof typeof CORE_INDICATORS.SECTOR_SPECIFIC] ||
        []
      ).forEach((indicator: string) => relevantIndicators.add(indicator));
    }
  });

  return allData.filter((item) => item.Category && relevantIndicators.has(item.Category));
}

export async function updateTradeData() {
  console.log('Starting trade data update...');

  for (const country of COUNTRIES) {
    try {
      // Fetch all indicators for the country in one call
      const countryData = await fetchIndicatorData(country);

      // Process each category using the fetched data
      for (const category of AVAILABLE_CATEGORIES) {
        const cacheKey = `representative_items:${country}:${category}`;
        console.log(`Processing ${country}/${category}...`);

        try {
          const categoryData = getCategoryIndicators(category, countryData);

          if (categoryData.length > 0) {
            const items: TradeItem[] = categoryData
              .filter((item) => item.Value !== undefined)
              .slice(0, 3)
              .map((item) => ({
                name: item.Category || category,
                basePrice: Math.abs(item.Value || 0),
                importShare: 0.5,
                explanation: `Based on ${item.Category || 'economic'} indicators`,
                lastUpdated: item.LastUpdate || new Date().toISOString(),
              }));

            if (items.length > 0) {
              const cacheData = {
                items,
                timestamp: Date.now(),
              };

              await redis.set(cacheKey, JSON.stringify(cacheData), { ex: CACHE_DURATION / 1000 });
              console.log(`Updated ${country}/${category} with ${items.length} items`);
            } else {
              console.log(`No valid items found for ${country}/${category}`);
            }
          } else {
            console.log(`No data found for ${country}/${category}`);
          }
        } catch (error) {
          console.error(`Error processing ${country}/${category}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing country ${country}:`, error);
    }
  }

  console.log('Trade data update complete');
}

// Function to get cached items
export async function getCachedItems(country: string, category: string): Promise<TradeItem[]> {
  const cacheKey = `representative_items:${country}:${category}`;
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
        return parsedCache.items;
      }
    }
  } catch (error) {
    console.error(`Error fetching cached items for ${country}/${category}:`, error);
  }
  return [];
}
