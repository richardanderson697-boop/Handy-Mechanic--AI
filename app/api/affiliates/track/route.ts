import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, affiliateType, provider, metadata } = body;

    const supabase = createClient();

    // Track the affiliate click/conversion
    const { data, error } = await supabase
      .from('affiliate_tracking')
      .insert({
        user_id: userId,
        affiliate_type: affiliateType, // 'insurance', 'vehicle_history', 'repair_shop'
        provider,
        metadata,
        clicked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Generate affiliate redirect URL with tracking
    const redirectUrl = generateAffiliateUrl(affiliateType, provider, data.id, metadata);

    return NextResponse.json({
      success: true,
      trackingId: data.id,
      redirectUrl,
    });

  } catch (error: any) {
    console.error('Affiliate tracking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track affiliate' },
      { status: 500 }
    );
  }
}

function generateAffiliateUrl(
  type: string,
  provider: string,
  trackingId: string,
  metadata: any
): string {
  // In production, these would be real affiliate URLs with your partner IDs
  const baseUrls: Record<string, Record<string, string>> = {
    insurance: {
      progressive: 'https://www.progressive.com/auto/?code=YOUR_AFFILIATE_ID',
      geico: 'https://www.geico.com/auto-insurance/?code=YOUR_AFFILIATE_ID',
      statefarm: 'https://www.statefarm.com/insurance/auto?code=YOUR_AFFILIATE_ID',
      allstate: 'https://www.allstate.com/auto-insurance?code=YOUR_AFFILIATE_ID',
    },
    vehicle_history: {
      carfax: 'https://www.carfax.com/VehicleHistory?partner=YOUR_AFFILIATE_ID',
      autocheck: 'https://www.autocheck.com/vehiclehistory/?dealer=YOUR_AFFILIATE_ID',
    },
  };

  const baseUrl = baseUrls[type]?.[provider.toLowerCase()] || '#';
  const params = new URLSearchParams({
    tracking: trackingId,
    ...metadata,
  });

  return `${baseUrl}&${params.toString()}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id');

    if (!trackingId) {
      return NextResponse.json(
        { error: 'Tracking ID required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update conversion status
    const { error } = await supabase
      .from('affiliate_tracking')
      .update({ 
        converted_at: new Date().toISOString(),
        status: 'converted',
      })
      .eq('id', trackingId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Affiliate conversion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track conversion' },
      { status: 500 }
    );
  }
}
