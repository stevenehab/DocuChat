import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '../../../lib/ollama';
import { fallbackFlashcards } from '../../../lib/utils';

type Flashcard = {
  question: string;
  answer: string;
};

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
    const { text, model, readingLevel, reduceJargon, count } = body;
    const safeCount = Math.max(3, Math.min(20, Number(count) || 6));
    const fallback = fallbackFlashcards(text, safeCount);

    const result = await generateJSON<{ cards: Flashcard[] }>(
      model,
      `You create accessible study flashcards.
Rules:
- Match the requested reading level.
- If reduce jargon is true, simplify technical language.
- Create exactly the requested number of cards.
- Keep answers concise.
- Use only the selected documents.`,
      `Create exactly ${safeCount} flashcards from the selected documents.

Reading level: ${readingLevel}
Reduce jargon: ${reduceJargon ? 'true' : 'false'}

Return JSON:
{
  "cards": [
    { "question": "question", "answer": "answer" }
  ]
}

Documents:
${String(text).slice(0, 18000)}`,
      fallback
    );

    const cards = Array.isArray(result?.cards) && result.cards.length ? result.cards : fallback.cards;
    return NextResponse.json({ cards: cards.slice(0, safeCount), mode: 'ai' });
  } catch {
    const safeCount = Math.max(3, Math.min(20, Number(body?.count) || 6));
    return NextResponse.json({ ...fallbackFlashcards(body?.text || '', safeCount), mode: 'demo' });
  }
}
