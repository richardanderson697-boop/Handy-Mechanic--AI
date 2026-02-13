import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { supabaseAdmin } from '@/lib/database';
import { getUserFromHeaders } from '@/lib/auth';
import { EnhancedDiagnosticRAG } from '@/lib/rag/diagnostic-rag';
import { AudioAnalyzer, audioFileToBuffer } from '@/lib/rag/audio-analyzer';
import type { DiagnosticResponse, VehicleInfo } from '@/lib/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const tokenPayload = getUserFromHeaders(request.headers);
    if (!tokenPayload) {
      return NextResponse.json<DiagnosticResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check credits
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', tokenPayload.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json<DiagnosticResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.credits < 1) {
      return NextResponse.json<DiagnosticResponse>(
        { success: false, error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    
    const vehicleYear = parseInt(formData.get('vehicleYear') as string);
    const vehicleMake = formData.get('vehicleMake') as string;
    const vehicleModel = formData.get('vehicleModel') as string;
    const vin = formData.get('vin') as string || undefined;
    const mileage = formData.get('mileage') ? parseInt(formData.get('mileage') as string) : undefined;
    const symptomText = formData.get('symptomText') as string;
    const audioFile = formData.get('audioFile') as File | null;
    
    // Get photo files
    const photoFiles: File[] = [];
    for (let i = 0; ; i++) {
      const photoFile = formData.get(`photoFile${i}`) as File | null;
      if (!photoFile) break;
      photoFiles.push(photoFile);
    }

    // Validate required fields
    if (!vehicleYear || !vehicleMake || !vehicleModel || !symptomText) {
      return NextResponse.json<DiagnosticResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const vehicleData: VehicleInfo = {
      year: vehicleYear,
      make: vehicleMake,
      model: vehicleModel,
      vin,
      mileage,
    };

    console.log('[v0] Starting diagnosis for:', vehicleData);

    // Process audio if provided
    let audioUrl: string | undefined;
    let audioAnalysis = null;

    if (audioFile && audioFile.size > 0) {
      console.log('[v0] Processing audio file, size:', audioFile.size);
      
      try {
        // Upload audio to Vercel Blob
        const audioBlob = await put(
          `audio/${user.id}/${Date.now()}-${audioFile.name}`,
          audioFile,
          { access: 'public' }
        );
        audioUrl = audioBlob.url;
        console.log('[v0] Audio uploaded:', audioUrl);

        // Analyze audio
        const audioAnalyzer = new AudioAnalyzer();
        const audioBuffer = await audioFileToBuffer(audioFile);
        audioAnalysis = await audioAnalyzer.analyzeAudio(audioBuffer);
        console.log('[v0] Audio analysis complete');
      } catch (audioError) {
        console.error('[v0] Audio processing error:', audioError);
        // Continue without audio analysis
      }
    }

    // Upload photos if provided
    const photoUrls: string[] = [];
    for (const photoFile of photoFiles) {
      if (photoFile.size > 0) {
        try {
          const photoBlob = await put(
            `photos/${user.id}/${Date.now()}-${photoFile.name}`,
            photoFile,
            { access: 'public' }
          );
          photoUrls.push(photoBlob.url);
        } catch (photoError) {
          console.error('[v0] Photo upload error:', photoError);
        }
      }
    }

    console.log('[v0] Uploaded', photoUrls.length, 'photos');

    // Run RAG-powered diagnosis
    const diagnosticRAG = new EnhancedDiagnosticRAG();
    const diagnosis = await diagnosticRAG.diagnose(
      vehicleData,
      symptomText,
      audioAnalysis,
      photoUrls.length > 0 ? photoUrls : undefined
    );

    console.log('[v0] Diagnosis generated');

    // Deduct credit
    const { error: creditError } = await supabaseAdmin.rpc('decrement_user_credits', {
      user_uuid: user.id,
      amount: 1,
    });

    if (creditError) {
      console.error('[v0] Credit deduction error:', creditError);
      // Continue anyway - diagnosis was generated
    }

    // Save diagnosis to database
    const processingTime = Date.now() - startTime;

    const { data: savedDiagnosis, error: saveError } = await supabaseAdmin
      .from('diagnoses')
      .insert([
        {
          user_id: user.id,
          vehicle_year: vehicleYear,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vin,
          mileage,
          symptom_text: symptomText,
          audio_url: audioUrl,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          audio_features: audioAnalysis?.features || null,
          audio_classification: audioAnalysis?.classification || null,
          diagnosis_result: diagnosis,
          primary_issue: diagnosis.primaryDiagnosis,
          confidence_score: diagnosis.confidence,
          severity: diagnosis.severity,
          safe_to_drive: diagnosis.safeToDrive,
          retrieved_tsbs: diagnosis.relatedTSBs || null,
          repair_steps: diagnosis.repairSteps,
          parts_needed: diagnosis.partsNeeded,
          estimated_cost: diagnosis.estimatedCost,
          youtube_videos: diagnosis.youtubeVideos,
          safety_warnings: diagnosis.safetyWarnings,
          immediate_action_required: diagnosis.immediateAction,
          credits_used: 1,
          processing_time_ms: processingTime,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('[v0] Diagnosis save error:', saveError);
    }

    // Get updated credits
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    console.log('[v0] Diagnosis complete in', processingTime, 'ms');

    return NextResponse.json<DiagnosticResponse>(
      {
        success: true,
        diagnosis,
        diagnosisId: savedDiagnosis?.id,
        creditsRemaining: updatedUser?.credits || 0,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Diagnosis error:', error);
    return NextResponse.json<DiagnosticResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Diagnosis failed',
      },
      { status: 500 }
    );
  }
}

// Get diagnosis history
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = getUserFromHeaders(request.headers);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: diagnoses, error } = await supabaseAdmin
      .from('diagnoses')
      .select('*')
      .eq('user_id', tokenPayload.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch diagnoses' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, diagnoses },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Fetch diagnoses error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch diagnoses' },
      { status: 500 }
    );
  }
}
