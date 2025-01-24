import { NextResponse } from 'next/server';
import { updateTradeData } from '@/app/lib/updateTradeData';

export async function GET(request: Request) {
    // Verify cron secret to ensure only authorized calls
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await updateTradeData();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
} 