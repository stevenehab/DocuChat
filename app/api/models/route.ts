import { NextResponse } from 'next/server';
import { listModels } from '../../../lib/ollama';

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json({ models: models.length ? models : ['phi:latest'] });
  } catch {
    return NextResponse.json({ models: ['phi:latest'] });
  }
}
