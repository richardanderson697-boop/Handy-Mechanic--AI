import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { getUserFromHeaders } from '@/lib/auth';
import { getInsuranceQuotes, isValidZipCode } from '@/lib/insurance/insurance-quotes';
import type { InsuranceQuoteRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = getUserFromHeaders(request.headers);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      vehicle,
      zipCode,
      age,
      drivingHistory,
      coverageType,
    } = body;

    // Validate required fields
    if (!vehicle || !zipCode || !age || !drivingHistory || !coverageType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isValidZipCode(zipCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid zip code format' },
        { status: 400 }
      );
    }

    console.log('[v0] Fetching insurance quotes for:', vehicle);

    // Build request
    const quoteRequest: InsuranceQuoteRequest = {
      vehicle,
      zipCode,
      age: parseInt(age),
      drivingHistory,
      coverageType,
    };

    // Get quotes from multiple providers
    const quotes = await getInsuranceQuotes(quoteRequest);

    // Save quote to database
    const { data: savedQuote, error: saveError } = await supabaseAdmin
      .from('insurance_quotes')
      .insert([
        {
          user_id: tokenPayload.userId,
          vehicle_year: vehicle.year,
          vehicle_make: vehicle.make,
          vehicle_model: vehicle.model,
          vin: vehicle.vin || null,
          zip_code: zipCode,
          age: parseInt(age),
          driving_history: drivingHistory,
          quotes,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('[v0] Failed to save insurance quote:', saveError);
    }

    console.log('[v0] Insurance quotes generated:', quotes.length);

    return NextResponse.json(
      {
        success: true,
        quoteId: savedQuote?.id,
        quotes,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Insurance quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get insurance quotes' },
      { status: 500 }
    );
  }
}

// Get user's insurance quote history
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = getUserFromHeaders(request.headers);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: quotes, error } = await supabaseAdmin
      .from('insurance_quotes')
      .select('*')
      .eq('user_id', tokenPayload.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch quotes' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, quotes },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Get quotes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
