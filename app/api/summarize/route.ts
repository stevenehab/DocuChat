import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '../../../lib/ollama';
import { fallbackSummary } from '../../../lib/utils';

type SummaryResult = {
  title: string;
  bullets: string[];
  paragraph: string;
};

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
    const { text, model, readingLevel, reduceJargon } = body;
    const fallback = fallbackSummary(text);

    const result = await generateJSON<SummaryResult>(
      model,
      `You are a learning assistant for people with learning disabilities.
Rules:
- Match the requested reading level exactly.
- If reduce jargon is true, simplify technical language.
- Keep the output clear and faithful to the documents.`,
      `Summarize the selected documents below.

Reading level: ${readingLevel}
Reduce jargon: ${reduceJargon ? 'true' : 'false'}

Return JSON:
{
  "title": "short title",
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "paragraph": "one clear paragraph"
}

Documents:
${String(text).slice(0, 18000)}`,
      fallback
    );

    return NextResponse.json({
      title: result?.title || fallback.title,
      bullets: Array.isArray(result?.bullets) ? result.bullets : fallback.bullets,
      paragraph: result?.paragraph || fallback.paragraph,
      mode: 'ai'
    });
  } catch {
    return NextResponse.json({ ...fallbackSummary(body?.text || ''), mode: 'demo' });
  }
}
