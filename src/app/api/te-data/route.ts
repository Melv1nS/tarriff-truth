import { NextResponse } from 'next/server';

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