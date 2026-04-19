import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const lower = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = '';

    if (lower.endsWith('.txt') || lower.endsWith('.md')) {
      content = buffer.toString('utf8');
    } else if (lower.endsWith('.pdf')) {
      try {
        const parsed = await pdf(buffer);
        content = parsed.text || '';
      } catch {
        return NextResponse.json({ error: 'Failed to read PDF' }, { status: 500 });
      }
    } else if (lower.endsWith('.docx')) {
      const parsed = await mammoth.extractRawText({ buffer });
      content = parsed.value || '';
    } else {
      return NextResponse.json({ error: 'Supported files: PDF, DOCX, TXT, MD' }, { status: 400 });
    }

    return NextResponse.json({
      name: file.name,
      type: file.type || 'application/octet-stream',
      content: content.trim()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
  }
}
