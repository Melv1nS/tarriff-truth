// Representative items for each category and country
export const REPRESENTATIVE_ITEMS: Record<string, Record<string, Array<{ name: string; basePrice: number; importShare: number; explanation: string }>>> = {
    'Mexico': {
        'Groceries & Food': [
            {
                name: 'Avocados',
                basePrice: 1.50,
                importShare: 0.80,
                explanation: 'Mexico supplies 80% of US avocados'
            },
            {
                name: 'Tomatoes',
                basePrice: 2.00,
                importShare: 0.70,
                explanation: 'Mexico is the largest tomato supplier to US'
            }
        ],
        'Transportation': [
            {
                name: 'Auto Parts',
                basePrice: 100,
                importShare: 0.60,
                explanation: 'Major auto manufacturing hub'
            }
        ],
        'Electronics': [
            {
                name: 'TVs & Displays',
                basePrice: 400,
                importShare: 0.70,
                explanation: 'Large electronics manufacturing base'
            }
        ]
    },
    'Canada': {
        'Groceries & Food': [
            {
                name: 'Dairy Products',
                basePrice: 5.00,
                importShare: 0.40,
                explanation: 'Significant dairy trade relationship'
            },
            {
                name: 'Wheat Products',
                basePrice: 3.00,
                importShare: 0.50,
                explanation: 'Major grain exporter to US'
            }
        ],
        'Transportation': [
            {
                name: 'Auto Parts',
                basePrice: 100,
                importShare: 0.50,
                explanation: 'Integrated auto manufacturing'
            }
        ],
        'Housing & Utilities': [
            {
                name: 'Lumber',
                basePrice: 1000,
                importShare: 0.70,
                explanation: 'Primary lumber supplier to US'
            }
        ]
    },
    'China': {
        'Electronics': [
            {
                name: 'Consumer Electronics',
                basePrice: 400,
                importShare: 0.80,
                explanation: 'Major electronics manufacturer'
            },
            {
                name: 'Computer Parts',
                basePrice: 200,
                importShare: 0.75,
                explanation: 'Primary supplier of components'
            }
        ],
        'Clothing': [
            {
                name: 'Apparel',
                basePrice: 50,
                importShare: 0.70,
                explanation: 'Large textile manufacturing base'
            }
        ],
        'Other Goods': [
            {
                name: 'Furniture',
                basePrice: 800,
                importShare: 0.60,
                explanation: 'Major furniture exporter to US'
            },
            {
                name: 'Home Goods',
                basePrice: 200,
                importShare: 0.65,
                explanation: 'Various household items'
            }
        ]
    }
} as const;

// Country-specific trade relationships
export const COUNTRY_TRADE_FACTORS: Record<string, {
    tradeIntensity: number;
    categoryFactors: Record<string, { importShare: number; supplyChainEffect: number }>;
}> = {
    'Mexico': {
        tradeIntensity: 1.2, // Strong trade relationship
        categoryFactors: {
            'Groceries & Food': { importShare: 0.45, supplyChainEffect: 0.8 },
            'Transportation': { importShare: 0.35, supplyChainEffect: 0.7 },
            'Housing & Utilities': { importShare: 0.15, supplyChainEffect: 0.5 },
            'Healthcare': { importShare: 0.10, supplyChainEffect: 0.4 },
            'Entertainment': { importShare: 0.20, supplyChainEffect: 0.5 },
            'Clothing': { importShare: 0.25, supplyChainEffect: 0.6 },
            'Electronics': { importShare: 0.30, supplyChainEffect: 0.7 },
            'Other Goods': { importShare: 0.20, supplyChainEffect: 0.5 }
        }
    },
    'Canada': {
        tradeIntensity: 1.1, // Strong but different trade mix
        categoryFactors: {
            'Groceries & Food': { importShare: 0.30, supplyChainEffect: 0.7 },
            'Transportation': { importShare: 0.40, supplyChainEffect: 0.8 },
            'Housing & Utilities': { importShare: 0.50, supplyChainEffect: 0.9 },
            'Healthcare': { importShare: 0.15, supplyChainEffect: 0.5 },
            'Entertainment': { importShare: 0.10, supplyChainEffect: 0.4 },
            'Clothing': { importShare: 0.05, supplyChainEffect: 0.3 },
            'Electronics': { importShare: 0.15, supplyChainEffect: 0.4 },
            'Other Goods': { importShare: 0.25, supplyChainEffect: 0.6 }
        }
    },
    'China': {
        tradeIntensity: 1.3, // Highest trade volume
        categoryFactors: {
            'Groceries & Food': { importShare: 0.15, supplyChainEffect: 0.5 },
            'Transportation': { importShare: 0.25, supplyChainEffect: 0.6 },
            'Housing & Utilities': { importShare: 0.20, supplyChainEffect: 0.5 },
            'Healthcare': { importShare: 0.30, supplyChainEffect: 0.6 },
            'Entertainment': { importShare: 0.40, supplyChainEffect: 0.7 },
            'Clothing': { importShare: 0.70, supplyChainEffect: 0.9 },
            'Electronics': { importShare: 0.75, supplyChainEffect: 0.9 },
            'Other Goods': { importShare: 0.60, supplyChainEffect: 0.8 }
        }
    }
}; 