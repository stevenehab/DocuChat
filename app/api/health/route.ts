import { NextResponse } from 'next/server';
import { getOllamaBaseUrl, listModels } from '../../../lib/ollama';

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json({
      ok: true,
      models: models.length ? models : ['phi:latest'],
      baseUrl: getOllamaBaseUrl(),
      mode: 'ai'
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      models: ['phi:latest'],
      baseUrl: getOllamaBaseUrl(),
      mode: 'demo',
      message: error?.message || 'Ollama not detected, using demo mode.'
    });
  }
}
