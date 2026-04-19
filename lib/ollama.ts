const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

export function getOllamaBaseUrl() {
  return OLLAMA_BASE_URL;
}

async function ollamaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${OLLAMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Ollama error ${res.status}`);
  }

  return res;
}

export async function listModels(): Promise<string[]> {
  const res = await ollamaFetch('/api/tags', { method: 'GET' });
  const json = await res.json();
  return Array.isArray(json?.models)
    ? json.models.map((m: any) => m.name).filter(Boolean)
    : [];
}

export async function generateText(model: string, system: string, prompt: string): Promise<string> {
  const res = await ollamaFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model,
      system,
      prompt,
      stream: false,
      keep_alive: '10m'
    })
  });
  const json = await res.json();
  return json?.response || '';
}

export async function generateJSON<T>(model: string, system: string, prompt: string, fallback: T): Promise<T> {
  const raw = await generateText(
    model,
    system,
    `${prompt}\n\nReturn valid JSON only. Do not use markdown fences.`
  );

  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
