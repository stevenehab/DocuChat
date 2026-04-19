import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '../../../lib/ollama';
import { chunkText, scoreChunk } from '../../../lib/utils';

type ChatMessage = { role: 'user' | 'assistant'; content: string; };
type SourceDoc = { name: string; content: string; };

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
    const { model, readingLevel, reduceJargon, messages, docs } = body;
    const safeMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];
    const safeDocs: SourceDoc[] = Array.isArray(docs) ? docs : [];
    const latestUser = [...safeMessages].reverse().find((m) => m.role === 'user')?.content || '';

    const chunkMatches = safeDocs.flatMap((doc) =>
      chunkText(String(doc.content || ''), 1000, 180).map((chunk, index) => ({
        id: index + 1,
        docName: doc.name,
        text: chunk,
        score: scoreChunk(latestUser, chunk)
      }))
    ).sort((a, b) => b.score - a.score).slice(0, 6);

    const context = chunkMatches.map((c, idx) => `[Source ${idx + 1} | ${c.docName}]\n${c.text}`).join('\n\n');
    const conversation = safeMessages.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const reply = await generateText(
      model,
      `You are a grounded study assistant.
Rules:
- Answer only from the retrieved source context.
- If the answer is not in the sources, say that clearly.
- Match the selected reading level.
- If reduce jargon is true, simplify language.
- End with a short Sources line listing the source numbers used.`,
      `Reading level: ${readingLevel}
Reduce jargon: ${reduceJargon ? 'true' : 'false'}

Retrieved source context:
${context}

Conversation:
${conversation}

Write the next assistant reply only.`
    );

    return NextResponse.json({
      reply: reply.trim() || 'I could not find a supported answer in the selected documents. Sources: none.',
      chunks: chunkMatches.map((c, idx) => ({
        id: idx + 1,
        docName: c.docName,
        score: c.score,
        text: c.text.slice(0, 260)
      })),
      mode: 'ai'
    });
  } catch {
    const safeMessages = Array.isArray(body?.messages) ? body.messages : [];
    const safeDocs = Array.isArray(body?.docs) ? body.docs : [];
    const latestUser = [...safeMessages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const chunkMatches = safeDocs.flatMap((doc: any) =>
      chunkText(String(doc.content || ''), 1000, 180).map((chunk, index) => ({
        id: index + 1,
        docName: doc.name,
        text: chunk,
        score: scoreChunk(latestUser, chunk)
      }))
    ).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

    const first = chunkMatches[0];
    const reply = first
      ? `Based on the selected files, the strongest matching source is from ${first.docName}. ${first.text.slice(0, 220)} ... Sources: 1`
      : 'I could not find relevant content in the selected files. Sources: none.';

    return NextResponse.json({
      reply,
      chunks: chunkMatches.map((c: any, idx: number) => ({
        id: idx + 1,
        docName: c.docName,
        score: c.score,
        text: c.text.slice(0, 260)
      })),
      mode: 'demo'
    });
  }
}
