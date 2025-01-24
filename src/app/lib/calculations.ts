import { REPRESENTATIVE_ITEMS, COUNTRY_TRADE_FACTORS } from './staticData';

interface BasePrices {
    [category: string]: number;
}

interface SpendingPatterns {
    [category: string]: number;
}

interface ImpactResult {
    totalImpact: number;
    categoryImpacts: {
        [category: string]: {
            impact: number;
            representativeItems: Array<{
                name: string;
                impact: number;
                explanation: string;
            }>;
        };
    };
}

interface CommodityPrices {
    [symbol: string]: number;
}

interface StateFactors {
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

interface CategoryConfig {
    basePassthroughRate: number;
    priceElasticity: number;
    importDependence: number;
    substitutionEffect: number;
    commoditySymbol?: string;
}

// Add constant for available categories
export const AVAILABLE_CATEGORIES = [
    'Groceries & Food',
    'Transportation',
    'Housing & Utilities',
    'Healthcare',
    'Entertainment',
    'Clothing',
    'Electronics',
    'Other Goods'
] as const;

async function fetchStateFactors(stateCode: string): Promise<StateFactors> {
    try {
        const response = await fetch(`/api/te-data?state=${stateCode}`);
        if (!response.ok) {
            console.warn(`Failed to fetch state factors for ${stateCode}, using defaults`);
            return {
                importExposure: 1.0,
                logisticsMultiplier: 1.0,
                economicResiliency: 1.0
            };
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching state factors for ${stateCode}:`, error);
        return {
            importExposure: 1.0,
            logisticsMultiplier: 1.0,
            economicResiliency: 1.0
        };
    }
}

async function fetchCommodityPrices(categories: string[]): Promise<CommodityPrices> {
    const commodityPrices: CommodityPrices = {};
    const fetchedSymbols = new Set<string>();

    for (const category of categories) {
        const commoditySymbol = getCommoditySymbol(category);
        if (commoditySymbol && !fetchedSymbols.has(commoditySymbol)) {
            try {
                const response = await fetch(`/api/te-data?commodity=${commoditySymbol}`);
                if (!response.ok) {
                    console.warn(`Failed to fetch price for ${commoditySymbol}`);
                    continue;
                }
                const data = await response.json();
                if (data[0]?.price) {
                    commodityPrices[commoditySymbol] = data[0].price;
                    fetchedSymbols.add(commoditySymbol);
                }
            } catch (error) {
                console.error(`Error fetching ${commoditySymbol} price:`, error);
            }
        }
    }
    return commodityPrices;
}

async function fetchCountryFactors(country: string): Promise<CountryIndicators> {
    try {
        const response = await fetch(`/api/te-data?country=${country}`);
        if (!response.ok) {
            console.warn(`Failed to fetch country factors for ${country}, using defaults`);
            return COUNTRY_TRADE_FACTORS[country] || {
                tradeIntensity: 1.0,
                categoryFactors: Object.fromEntries(
                    AVAILABLE_CATEGORIES.map(category => [
                        category,
                        { importShare: 0.2, supplyChainEffect: 0.7 }
                    ])
                )
            };
        }

        // Parse the response data
        const data = await response.json();

        // If we have valid API data, try to use it
        if (data && typeof data === 'object') {
            try {
                // Attempt to extract trade intensity from trade balance or similar indicator
                const tradeIntensity = data.tradeIntensity || COUNTRY_TRADE_FACTORS[country]?.tradeIntensity || 1.0;

                // Use our predefined category factors as base, then overlay with any API data
                const baseFactors = COUNTRY_TRADE_FACTORS[country]?.categoryFactors || {};

                const categoryFactors: CountryIndicators['categoryFactors'] = {};

                // Ensure we have entries for all available categories
                AVAILABLE_CATEGORIES.forEach(category => {
                    categoryFactors[category] = {
                        importShare: baseFactors[category]?.importShare || 0.2,
                        supplyChainEffect: baseFactors[category]?.supplyChainEffect || 0.7
                    };
                });

                return {
                    tradeIntensity,
                    categoryFactors
                };
            } catch (parseError) {
                console.error('Error parsing API response:', parseError);
            }
        }

        // Fallback to predefined factors
        console.warn(`Invalid API response for ${country}, using predefined factors`);
        return COUNTRY_TRADE_FACTORS[country] || {
            tradeIntensity: 1.0,
            categoryFactors: Object.fromEntries(
                AVAILABLE_CATEGORIES.map(category => [
                    category,
                    { importShare: 0.2, supplyChainEffect: 0.7 }
                ])
            )
        };
    } catch (error) {
        console.error(`Error fetching country factors for ${country}:`, error);
        // Use predefined factors as fallback
        return COUNTRY_TRADE_FACTORS[country] || {
            tradeIntensity: 1.0,
            categoryFactors: Object.fromEntries(
                AVAILABLE_CATEGORIES.map(category => [
                    category,
                    { importShare: 0.2, supplyChainEffect: 0.7 }
                ])
            )
        };
    }
}

function calculateEffectivePassthrough(
    basePassthrough: number,
    elasticity: number,
    importDependence: number,
    substitutionEffect: number,
    tariffRate: number,
    stateFactors: StateFactors
): number {
    // Adjust passthrough based on price elasticity
    const elasticityAdjustment = Math.max(0.1, 1 - (elasticity * tariffRate));

    // Consider import dependence - higher dependence means less ability to avoid tariffs
    // Now adjusted by state-specific import exposure from real data
    const importEffect = Math.min(1.5, importDependence * stateFactors.importExposure);

    // Account for substitution possibilities, adjusted by state economic resiliency
    const substitutionAdjustment = Math.max(0.5, 1 - (substitutionEffect * tariffRate * stateFactors.economicResiliency));

    // Apply logistics multiplier to the final passthrough rate
    // Cap the final passthrough to prevent unrealistic results
    return Math.min(1.0, basePassthrough * elasticityAdjustment * importEffect * substitutionAdjustment * stateFactors.logisticsMultiplier);
}

async function fetchCategoryFactors(category: string): Promise<CategoryConfig> {
    try {
        const response = await fetch(`/api/te-data?category=${category}`);
        if (!response.ok) {
            console.warn(`Failed to fetch category factors for ${category}, using defaults`);
            return {
                basePassthroughRate: 0.7,
                priceElasticity: 0.5,
                importDependence: 0.4,
                substitutionEffect: 0.5,
                commoditySymbol: getCommoditySymbol(category)
            };
        }
        const data = await response.json();
        return {
            ...data,
            commoditySymbol: getCommoditySymbol(category)
        };
    } catch (error) {
        console.error(`Error fetching category factors for ${category}:`, error);
        return {
            basePassthroughRate: 0.7,
            priceElasticity: 0.5,
            importDependence: 0.4,
            substitutionEffect: 0.5,
            commoditySymbol: getCommoditySymbol(category)
        };
    }
}

function getCommoditySymbol(category: string): string | undefined {
    const commodityMap: Record<string, string> = {
        'Groceries & Food': 'WHEAT',
        'Transportation': 'GASOLINE',
        'Housing & Utilities': 'LUMBER',
        'Clothing': 'COTTON',
        'Electronics': 'COPPER'
    };
    return commodityMap[category];
}

async function fetchRepresentativeItems(country: string, category: string): Promise<Array<{
    name: string;
    basePrice: number;
    importShare: number;
    explanation: string;
}>> {
    try {
        const response = await fetch(`/api/te-data/representative-items?country=${country}&category=${category}`);
        if (!response.ok) {
            console.warn(`Failed to fetch representative items for ${country}/${category}, using defaults`);
            return REPRESENTATIVE_ITEMS[country]?.[category] || [];
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching representative items for ${country}/${category}:`, error);
        return REPRESENTATIVE_ITEMS[country]?.[category] || [];
    }
}

export async function calculateTariffImpact(
    basePrices: BasePrices,
    tariffRate: number,
    spendingPatterns: SpendingPatterns,
    stateCode: string,
    country: string
): Promise<ImpactResult> {
    console.log('Starting tariff impact calculation:', { country, stateCode, tariffRate });

    const categoryImpacts: ImpactResult['categoryImpacts'] = {};
    let totalImpact = 0;

    try {
        // Get state-specific economic factors from real-time data
        const stateFactors = await fetchStateFactors(stateCode);
        console.log('Fetched state factors:', stateFactors);

        // Get country-specific trade factors from real-time data
        const countryFactors = await fetchCountryFactors(country);
        console.log('Fetched country factors:', countryFactors);

        // Fetch current commodity prices
        const commodityPrices = await fetchCommodityPrices(Object.keys(spendingPatterns));
        console.log('Fetched commodity prices:', commodityPrices);

        // Process each category in parallel for better performance
        const categoryPromises = Object.entries(spendingPatterns).map(async ([category, monthlySpend]) => {
            try {
                if (!basePrices[category]) {
                    console.warn(`No base price found for category: ${category}`);
                    return null;
                }

                // Fetch real-time category factors
                const config = await fetchCategoryFactors(category);
                console.log(`Category factors for ${category}:`, config);

                // Ensure we have valid category factors
                if (!countryFactors.categoryFactors || !countryFactors.categoryFactors[category]) {
                    console.warn(`Missing category factors for ${category}, using defaults`);
                    countryFactors.categoryFactors = countryFactors.categoryFactors || {};
                    countryFactors.categoryFactors[category] = {
                        importShare: 0.2,
                        supplyChainEffect: 0.7
                    };
                }

                const categoryFactors = countryFactors.categoryFactors[category];
                let adjustedBasePrice = monthlySpend;

                // Adjust price if we have commodity data, but limit the adjustment
                if (config.commoditySymbol && commodityPrices[config.commoditySymbol]) {
                    const commodityPrice = commodityPrices[config.commoditySymbol];
                    const priceChange = (commodityPrice - basePrices[category]) / basePrices[category];
                    // Limit commodity price impact to ±20%
                    adjustedBasePrice *= (1 + Math.max(-0.2, Math.min(0.2, priceChange)));
                }

                const effectivePassthrough = calculateEffectivePassthrough(
                    config.basePassthroughRate,
                    config.priceElasticity,
                    config.importDependence,
                    config.substitutionEffect,
                    tariffRate / 100,
                    stateFactors
                );

                // Apply country-specific factors from real-time data
                const countryAdjustedPassthrough = effectivePassthrough *
                    countryFactors.tradeIntensity *
                    categoryFactors.supplyChainEffect;

                // Calculate the impact as a percentage of spending, scaled by import share
                const maxImpact = adjustedBasePrice * (tariffRate / 100);
                const actualImpact = maxImpact * countryAdjustedPassthrough * categoryFactors.importShare;

                // Fetch and calculate representative item impacts
                const representativeItems = await fetchRepresentativeItems(country, category);
                const itemImpacts = representativeItems.map(item => {
                    const itemImpact = item.basePrice * (tariffRate / 100) * countryAdjustedPassthrough * item.importShare;
                    return {
                        name: item.name,
                        impact: Math.round(itemImpact * 100) / 100,
                        explanation: item.explanation
                    };
                });

                // Annualize the impact
                const annualImpact = actualImpact * 12;

                console.log(`Calculated impact for ${category}:`, {
                    annualImpact,
                    effectivePassthrough,
                    countryAdjustedPassthrough,
                    itemImpacts
                });

                return {
                    category,
                    impact: Math.round(annualImpact * 100) / 100,
                    representativeItems: itemImpacts
                };
            } catch (error) {
                console.error(`Error calculating impact for category ${category}:`, error);
                return null;
            }
        });

        // Wait for all category calculations to complete
        const results = await Promise.all(categoryPromises);

        // Combine results
        results.forEach(result => {
            if (result) {
                categoryImpacts[result.category] = {
                    impact: result.impact,
                    representativeItems: result.representativeItems
                };
                totalImpact += result.impact;
            }
        });

        const finalResult = {
            totalImpact: Math.round(totalImpact * 100) / 100,
            categoryImpacts
        };

        console.log('Final calculation result:', finalResult);
        return finalResult;
    } catch (error) {
        console.error('Error in tariff impact calculation:', error);
        throw error;
    }
} 