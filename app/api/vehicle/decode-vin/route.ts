import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeaders } from '@/lib/auth';
import { decodeVIN, getVINRecalls, isValidVIN } from '@/lib/vehicle/vin-decoder';

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
    const { vin } = body;

    if (!vin) {
      return NextResponse.json(
        { success: false, error: 'VIN is required' },
        { status: 400 }
      );
    }

    if (!isValidVIN(vin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid VIN format' },
        { status: 400 }
      );
    }

    // Decode VIN
    const vehicleInfo = await decodeVIN(vin);
    
    if (!vehicleInfo) {
      return NextResponse.json(
        { success: false, error: 'Failed to decode VIN' },
        { status: 404 }
      );
    }

    // Get recalls
    const recalls = await getVINRecalls(vin);

    return NextResponse.json(
      {
        success: true,
        vehicle: vehicleInfo,
        recalls,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] VIN decode error:', error);
    return NextResponse.json(
      { success: false, error: 'VIN decode failed' },
      { status: 500 }
    );
  }
}
