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
      .from('diagnoses')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      diagnoses: data,
    });

  } catch (error: any) {
    console.error('Get diagnoses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get diagnoses' },
      { status: 500 }
    );
  }
}
