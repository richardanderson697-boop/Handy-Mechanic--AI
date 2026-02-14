import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.userId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      credits: data.credits,
    });

  } catch (error: any) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credits' },
      { status: 500 }
    );
  }
}
