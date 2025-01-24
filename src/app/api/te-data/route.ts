import { NextResponse } from 'next/server';

interface StateIndicators {
    importExposure: number;
    logisticsMultiplier: number;
    economicResiliency: number;
}

interface CountryIndicators {
    tradeIntensity: number;
    categoryFactors: {
        [category: string]: {
            importShare: number;
            supplyChainEffect: number;
        };
    };
}

interface TEDataResponse {
    value?: number;
    symbol?: string;
    price?: number;
    date?: string;
    category?: string;
    [key: string]: unknown;
}

// Simple in-memory cache for data
const priceCache = new Map<string, { price: number; timestamp: number }>();
const stateCache = new Map<string, { data: StateIndicators; timestamp: number }>();
const countryCache = new Map<string, { data: CountryIndicators; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

// Add new interface for economic factors
interface CategoryIndicators {
    basePassthroughRate: number;
    priceElasticity: number;
    importDependence: number;
    substitutionEffect: number;
}

// Add new cache for category data
const categoryCache = new Map<string, { data: CategoryIndicators; timestamp: number }>();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const country = searchParams.get('country');
    const commodity = searchParams.get('commodity');
    const category = searchParams.get('category');

    console.log('TE API Request:', { state, country, commodity, category });

    try {
        if (state) {
            // Fetch state-specific economic data
            const response = await fetch(
                `https://api.tradingeconomics.com/state/${state}/indicators`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            );

            if (!response.ok) {
                console.error('TE API Error (State):', response.statusText);
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('TE API Response (State):', data);
            return NextResponse.json(data);
        }

        if (country) {
            // Fetch country trade data
            const response = await fetch(
                `https://api.tradingeconomics.com/country/${country}/indicators`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            );

            if (!response.ok) {
                console.error('TE API Error (Country):', response.statusText);
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('TE API Response (Country):', data);
            return NextResponse.json(data);
        }

        if (commodity) {
            // Fetch commodity prices
            const response = await fetch(
                `https://api.tradingeconomics.com/markets/commodities/${commodity}`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            );

            if (!response.ok) {
                console.error('TE API Error (Commodity):', response.statusText);
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('TE API Response (Commodity):', data);
            return NextResponse.json(data);
        }

        if (category) {
            // Fetch category indicators
            const response = await fetch(
                `https://api.tradingeconomics.com/markets/categories/${category}`,
                {
                    headers: { 'Authorization': `Client ${process.env.TRADING_ECONOMICS_API_KEY}` }
                }
            );

            if (!response.ok) {
                console.error('TE API Error (Category):', response.statusText);
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('TE API Response (Category):', data);
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    } catch (error) {
        console.error('TE API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function calculateCountryIndicators(
    tradeData: TEDataResponse[],
    importData: TEDataResponse[],
    supplyChainData: TEDataResponse[]
): CountryIndicators {
    // Calculate trade intensity based on trade balance and total trade volume
    const tradeBalance = tradeData[0]?.value || 0;
    const tradeIntensity = normalizeTradeIntensity(tradeBalance);

    // Map import categories to our application categories
    const categoryMapping = {
        'Food & Beverages': 'Groceries & Food',
        'Transport Equipment': 'Transportation',
        'Construction Materials': 'Housing & Utilities',
        'Medical & Pharmaceutical': 'Healthcare',
        'Recreation & Culture': 'Entertainment',
        'Textiles & Clothing': 'Clothing',
        'Electronics & Computers': 'Electronics',
        'Miscellaneous': 'Other Goods'
    };

    // Calculate category factors
    const categoryFactors: CountryIndicators['categoryFactors'] = {};

    Object.entries(categoryMapping).forEach(([teCategory, appCategory]) => {
        const categoryImports = importData.find(d => d.category === teCategory)?.value || 0;
        const supplyChainScore = supplyChainData.find(d => d.category === teCategory)?.value || 50;

        categoryFactors[appCategory] = {
            importShare: normalizeImportShare(categoryImports),
            supplyChainEffect: normalizeSupplyChainEffect(supplyChainScore)
        };
    });

    return {
        tradeIntensity,
        categoryFactors
    };
}

function normalizeTradeIntensity(tradeBalance: number): number {
    // Normalize trade balance to 0.5-1.5 range
    // Positive balance indicates stronger trade relationship
    return Math.max(0.5, Math.min(1.5, 1 + (tradeBalance / 1000000)));
}

function normalizeImportShare(imports: number): number {
    // Normalize import value to 0-1 range
    // Higher value means larger share of imports
    return Math.max(0, Math.min(1, imports / 1000000));
}

function normalizeSupplyChainEffect(score: number): number {
    // Normalize supply chain score to 0-1 range
    // Higher score means more integrated supply chains
    return Math.max(0, Math.min(1, score / 100));
}

// Normalization functions to convert raw data into 0-2 range factors
function normalizeTradeData(data: TEDataResponse[]): number {
    // Convert trade balance data into import exposure factor
    // Higher trade deficit = higher import exposure
    const tradeBalance = data[0]?.value || 0;
    // Normalize to 0.5-1.5 range where 1.0 is national average
    return Math.max(0.5, Math.min(1.5, 1 + (tradeBalance / 10000)));
}

function normalizeTransportData(data: TEDataResponse[]): number {
    // Convert transportation cost index into logistics multiplier
    const transportIndex = data[0]?.value || 100;
    // Normalize to 0.8-1.2 range where 1.0 is national average
    return Math.max(0.8, Math.min(1.2, transportIndex / 100));
}

function normalizeGDPData(data: TEDataResponse[]): number {
    // Convert GDP growth into economic resiliency factor
    const gdpGrowth = data[0]?.value || 2;
    // Normalize to 0.7-1.3 range where 1.0 is national average
    return Math.max(0.7, Math.min(1.3, 1 + (gdpGrowth / 10)));
}

function calculateCategoryIndicators(
    ppiData: TEDataResponse[],
    elasticityData: TEDataResponse[],
    importData: TEDataResponse[],
    substitutionData: TEDataResponse[]
): CategoryIndicators {
    // Calculate base passthrough rate from PPI volatility
    // Lower volatility suggests higher passthrough
    const ppiVolatility = calculateVolatility(ppiData.map(d => d.value || 0));
    const basePassthroughRate = normalizePassthroughRate(ppiVolatility);

    // Get price elasticity from demand sensitivity data
    const elasticity = elasticityData[0]?.value || 0.5;
    const priceElasticity = normalizeElasticity(elasticity);

    // Calculate import dependence from import penetration ratio
    const importRatio = importData[0]?.value || 0.3;
    const importDependence = normalizeImportDependence(importRatio);

    // Get substitution effect from cross-price elasticity
    const crossElasticity = substitutionData[0]?.value || 0.5;
    const substitutionEffect = normalizeSubstitutionEffect(crossElasticity);

    return {
        basePassthroughRate,
        priceElasticity,
        importDependence,
        substitutionEffect
    };
}

function calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

function normalizePassthroughRate(volatility: number): number {
    // Higher volatility = lower passthrough rate
    return Math.max(0.3, Math.min(0.9, 1 - (volatility / 10)));
}

function normalizeElasticity(elasticity: number): number {
    // Normalize to 0.1-0.9 range
    return Math.max(0.1, Math.min(0.9, elasticity));
}

function normalizeImportDependence(ratio: number): number {
    // Normalize to 0.2-0.9 range
    return Math.max(0.2, Math.min(0.9, ratio));
}

function normalizeSubstitutionEffect(elasticity: number): number {
    // Normalize to 0.2-0.8 range
    return Math.max(0.2, Math.min(0.8, elasticity));
} 

//test comment