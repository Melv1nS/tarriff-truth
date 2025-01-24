import { Redis } from '@upstash/redis';
import { AVAILABLE_CATEGORIES } from './calculations';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Trading Economics category mapping
const TE_CATEGORY_MAPPING: Record<string, string> = {
    'Groceries & Food': 'food-beverage',
    'Transportation': 'transport-equipment',
    'Housing & Utilities': 'construction-materials',
    'Healthcare': 'medical-pharmaceutical',
    'Entertainment': 'recreation-culture',
    'Clothing': 'textiles-clothing',
    'Electronics': 'electronics-computers',
    'Other Goods': 'consumer-goods'
};

const COUNTRIES = ['Mexico', 'Canada', 'China'] as const;
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const MIN_TRADE_VOLUME = 100; // million USD

interface TradeItem {
    name: string;
    basePrice: number;
    importShare: number;
    explanation: string;
    lastUpdated: string;
}

async function fetchTradeData(country: string, category: string): Promise<any[]> {
    const teCategory = TE_CATEGORY_MAPPING[category];
    if (!teCategory) return [];

    try {
        // Fetch both imports and trade balance data
        const [importsResponse, tradeResponse] = await Promise.all([
            fetch(
                `https://api.tradingeconomics.com/country/${country}/imports/${teCategory}`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            ),
            fetch(
                `https://api.tradingeconomics.com/country/${country}/trade/${teCategory}`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            )
        ]);

        const imports = importsResponse.ok ? await importsResponse.json() : [];
        const trade = tradeResponse.ok ? await tradeResponse.json() : [];

        return [...imports, ...trade].filter(item => item && item.volume && item.volume > MIN_TRADE_VOLUME);
    } catch (error) {
        console.error(`Error fetching trade data for ${country}/${category}:`, error);
        return [];
    }
}

function calculateImportShare(data: any[]): number {
    const totalTrade = data.reduce((sum, item) => sum + (item.volume || 0), 0);
    const imports = data
        .filter(item => item.value < 0)
        .reduce((sum, item) => sum + (item.volume || 0), 0);

    return totalTrade > 0 ? imports / totalTrade : 0;
}

export async function updateTradeData() {
    console.log('Starting trade data update...');

    for (const country of COUNTRIES) {
        for (const category of AVAILABLE_CATEGORIES) {
            const cacheKey = `representative_items:${country}:${category}`;
            console.log(`Fetching data for ${country}/${category}...`);

            try {
                const tradeData = await fetchTradeData(country, category);

                if (tradeData.length > 0) {
                    // Sort by volume and take top 3
                    const significantItems = tradeData
                        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
                        .slice(0, 3);

                    const items: TradeItem[] = significantItems.map(item => ({
                        name: item.symbol || item.category,
                        basePrice: Math.abs(item.value || item.price || 0),
                        importShare: calculateImportShare(tradeData.filter(d => d.symbol === item.symbol)),
                        explanation: `$${(item.volume / 1000000).toFixed(1)}B annual trade volume`,
                        lastUpdated: new Date().toISOString()
                    }));

                    const cacheData = {
                        items,
                        timestamp: Date.now()
                    };

                    await redis.set(cacheKey, JSON.stringify(cacheData), { ex: CACHE_DURATION / 1000 });
                    console.log(`Updated ${country}/${category} with ${items.length} items`);
                } else {
                    console.log(`No trade data found for ${country}/${category}`);
                }
            } catch (error) {
                console.error(`Error updating ${country}/${category}:`, error);
            }
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