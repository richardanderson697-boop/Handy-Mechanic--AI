/**
 * Knowledge Base Ingestion Script
 * 
 * This script populates the Pinecone vector database with automotive diagnostic knowledge.
 * Run this once during initial setup to enable RAG-powered diagnostics.
 * 
 * Usage: npx tsx scripts/ingest-knowledge-base.ts
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TSBDocument {
  id: string;
  make: string;
  model: string;
  year: number;
  component: string;
  symptom: string;
  diagnosis: string;
  solution: string;
  tsb_number?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Sample TSB data structure
const sampleTSBs: TSBDocument[] = [
  {
    id: 'tsb-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2018,
    component: 'Transmission',
    symptom: 'Delayed engagement, hard shifting between gears',
    diagnosis: 'Transmission fluid degradation causing valve body sticking',
    solution: 'Drain and refill transmission fluid with Toyota Type IV ATF. Reset transmission adaptive learning.',
    tsb_number: 'T-SB-0123-18',
    severity: 'medium',
  },
  {
    id: 'tsb-002',
    make: 'Honda',
    model: 'Accord',
    year: 2019,
    component: 'Engine',
    symptom: 'Check engine light, rough idle, misfires',
    diagnosis: 'Faulty ignition coil causing cylinder misfire (P0301-P0304)',
    solution: 'Replace affected ignition coil and spark plug. Clear codes and test drive.',
    tsb_number: 'H-ENG-0456-19',
    severity: 'high',
  },
  {
    id: 'tsb-003',
    make: 'Ford',
    model: 'F-150',
    year: 2020,
    component: 'Brakes',
    symptom: 'Squealing noise during braking, brake pedal pulsation',
    diagnosis: 'Warped brake rotors and worn brake pads',
    solution: 'Replace front brake pads and resurface or replace rotors. Torque to spec 100 ft-lbs.',
    tsb_number: 'F-BRK-0789-20',
    severity: 'high',
  },
  // Add more sample TSBs...
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function ingestTSB(tsb: TSBDocument, index: any) {
  // Create rich text for embedding
  const textForEmbedding = `
    Vehicle: ${tsb.year} ${tsb.make} ${tsb.model}
    Component: ${tsb.component}
    Symptom: ${tsb.symptom}
    Diagnosis: ${tsb.diagnosis}
    Solution: ${tsb.solution}
    Severity: ${tsb.severity}
  `.trim();

  // Generate embedding
  console.log(`Generating embedding for ${tsb.id}...`);
  const embedding = await generateEmbedding(textForEmbedding);

  // Upsert to Pinecone
  await index.upsert([
    {
      id: tsb.id,
      values: embedding,
      metadata: {
        make: tsb.make,
        model: tsb.model,
        year: tsb.year,
        component: tsb.component,
        symptom: tsb.symptom,
        diagnosis: tsb.diagnosis,
        solution: tsb.solution,
        tsb_number: tsb.tsb_number || '',
        severity: tsb.severity,
        text: textForEmbedding,
      },
    },
  ]);

  // Store in Supabase for reference
  await supabase.from('tsb_documents').upsert({
    id: tsb.id,
    make: tsb.make,
    model: tsb.model,
    year_start: tsb.year,
    year_end: tsb.year,
    component: tsb.component,
    symptom: tsb.symptom,
    diagnosis: tsb.diagnosis,
    solution: tsb.solution,
    tsb_number: tsb.tsb_number,
    severity: tsb.severity,
  });

  console.log(`✓ Ingested ${tsb.id}`);
}

async function fetchNHTSATSBs(make: string, model: string, year: number) {
  // Fetch TSBs from NHTSA API
  const url = `https://api.nhtsa.gov/vehicles/GetTSBs?make=${make}&model=${model}&modelYear=${year}&format=json`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Results && data.Results.length > 0) {
      console.log(`Found ${data.Results.length} TSBs for ${year} ${make} ${model}`);
      return data.Results;
    }
  } catch (error) {
    console.error(`Error fetching NHTSA TSBs: ${error}`);
  }
  
  return [];
}

async function main() {
  console.log('🚀 Starting knowledge base ingestion...\n');

  // Connect to Pinecone index
  const indexName = process.env.PINECONE_INDEX_NAME || 'automotive-diagnostics';
  const index = pinecone.index(indexName);

  console.log(`Connected to Pinecone index: ${indexName}\n`);

  // Ingest sample TSBs
  console.log('📚 Ingesting sample TSB documents...');
  for (const tsb of sampleTSBs) {
    await ingestTSB(tsb, index);
    // Rate limit to avoid API throttling
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n✅ Sample TSBs ingested successfully!');

  // Optionally fetch real TSBs from NHTSA
  console.log('\n🔍 Fetching additional TSBs from NHTSA...');
  const popularVehicles = [
    { make: 'Toyota', model: 'Camry', year: 2020 },
    { make: 'Honda', model: 'Civic', year: 2020 },
    { make: 'Ford', model: 'F-150', year: 2020 },
    { make: 'Chevrolet', model: 'Silverado', year: 2020 },
  ];

  for (const vehicle of popularVehicles) {
    console.log(`\nFetching ${vehicle.year} ${vehicle.make} ${vehicle.model}...`);
    const tsbs = await fetchNHTSATSBs(vehicle.make, vehicle.model, vehicle.year);
    
    // Process and ingest (simplified - you'd want to parse these properly)
    for (let i = 0; i < Math.min(tsbs.length, 10); i++) {
      const tsb = tsbs[i];
      // Parse NHTSA TSB format and create TSBDocument
      // This is simplified - actual implementation would parse the full TSB text
      console.log(`  - ${tsb.Component || 'Unknown component'}`);
    }
  }

  console.log('\n✨ Knowledge base ingestion complete!');
  console.log(`\n📊 Stats:`);
  console.log(`  - TSBs ingested: ${sampleTSBs.length}`);
  console.log(`  - Embeddings generated: ${sampleTSBs.length}`);
  console.log(`  - Pinecone index: ${indexName}`);
  console.log('\n💡 Your RAG system is now ready for diagnostics!');
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
