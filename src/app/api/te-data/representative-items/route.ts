import { NextResponse } from 'next/server';
import { REPRESENTATIVE_ITEMS } from '@/app/lib/staticData';
import { getCachedItems, updateTradeData } from '@/app/lib/updateTradeData';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const category = searchParams.get('category');

    if (!country || !category) {
        return NextResponse.json({ error: 'Missing country or category' }, { status: 400 });
    }

    try {
        // Try to get cached items first
        const cachedItems = await getCachedItems(country, category);

        if (cachedItems.length > 0) {
            return NextResponse.json(cachedItems);
        }

        // If no cached items, trigger an update and return static data as fallback
        updateTradeData().catch(error => {
            console.error('Background update failed:', error);
        });

        // Return static data while update runs in background
        return NextResponse.json(REPRESENTATIVE_ITEMS[country]?.[category] || []);
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(REPRESENTATIVE_ITEMS[country]?.[category] || []);
    }
} 