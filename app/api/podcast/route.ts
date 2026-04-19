import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '../../../lib/ollama';
import { fallbackPodcast } from '../../../lib/utils';

type PodcastResult = {
  title: string;
  intro: string;
  segments: string[];
  outro: string;
};

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
    const { text, model, readingLevel, reduceJargon } = body;
    const fallback = fallbackPodcast(text);

    const result = await generateJSON<PodcastResult>(
      model,
      `You write short study podcast scripts for learners with attention and reading challenges.
Rules:
- Match the requested reading level.
- If reduce jargon is true, simplify technical language.
- Use short segments.
- Stay faithful to the selected documents.`,
      `Write a short study podcast script from the selected documents.

Reading level: ${readingLevel}
Reduce jargon: ${reduceJargon ? 'true' : 'false'}

Return JSON:
{
  "title": "short title",
  "intro": "short intro",
  "segments": ["segment 1", "segment 2", "segment 3"],
  "outro": "short outro"
}

Documents:
${String(text).slice(0, 18000)}`,
      fallback
    );

    return NextResponse.json({
      title: result?.title || fallback.title,
      intro: result?.intro || fallback.intro,
      segments: Array.isArray(result?.segments) ? result.segments : fallback.segments,
      outro: result?.outro || fallback.outro,
      mode: 'ai'
    });
  } catch {
    return NextResponse.json({ ...fallbackPodcast(body?.text || ''), mode: 'demo' });
  }
}
