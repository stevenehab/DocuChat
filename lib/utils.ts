import type { DocItem } from './types';

export function formatDateStable(date: string) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

export function chunkText(text: string, chunkSize = 1000, overlap = 180): string[] {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

export function scoreChunk(query: string, chunk: string): number {
  const tokens = String(query || '').toLowerCase().split(/\W+/).filter(Boolean);
  const hay = chunk.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 2;
    if (token.length > 4 && hay.includes(token.slice(0, 4))) score += 1;
  }
  return score;
}

export function combineDocs(docs: DocItem[], activeIds: string[]) {
  return docs
    .filter((d) => activeIds.includes(d.id))
    .map((d) => `SOURCE: ${d.name}\n\n${d.content}`)
    .join('\n\n---\n\n');
}

function firstSentences(text: string, n = 4) {
  return String(text || '').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, n);
}

export function fallbackSummary(text: string) {
  const sentences = firstSentences(text, 4);
  if (!sentences.length) {
    return {
      title: 'Summary',
      bullets: ['No content was found in the selected files.'],
      paragraph: 'Upload or select files to generate a summary.'
    };
  }
  return {
    title: 'Summary',
    bullets: sentences.slice(0, 3),
    paragraph: sentences.join(' ')
  };
}

export function fallbackFlashcards(text: string, count = 6) {
  const lines = String(text || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const bank = [
    ['What are the selected notes mainly about?', lines[0] || 'The selected files.'],
    ['What should you read first?', 'Start with the title and the first main section.'],
    ['What is one key takeaway?', 'Explain the main idea in simple words.'],
    ['What should you memorize?', lines[1] || 'The most repeated important ideas.'],
    ['What is one supporting detail?', lines[2] || 'A detail that explains the main idea.'],
    ['How can you study this better?', 'Turn key ideas into questions and answer them aloud.'],
    ['What part needs review?', 'Any part that still feels unclear after one pass.'],
    ['How would you explain this to a classmate?', 'Use short sentences and everyday words.'],
    ['What is the topic of the document?', lines[0] || 'The selected files.'],
    ['What is a good next step?', 'Review the summary, then quiz yourself with flashcards.']
  ];
  return {
    cards: bank.slice(0, Math.max(3, Math.min(20, count))).map(([question, answer]) => ({
      question,
      answer
    }))
  };
}

export function fallbackPodcast(text: string) {
  const lines = String(text || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    title: 'Study Podcast',
    intro: lines[0] || 'Today we are reviewing the selected study files.',
    segments: [
      'First, focus on the main topic.',
      'Next, look at the most important supporting ideas.',
      'Then, restate the lesson in your own words.'
    ],
    outro: 'That is the end of the review.'
  };
}
