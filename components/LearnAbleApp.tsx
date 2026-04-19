'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ChunkMatch, DocItem, Flashcard, HealthResult, PodcastResult, ReadingLevel, SummaryResult } from '../lib/types';
import { combineDocs, formatDateStable } from '../lib/utils';

const STORAGE_KEY = 'learnable-full-ready-app-v1';

const defaultDoc: DocItem = {
  id: 'seed-1',
  name: '402_proposal.pdf',
  type: 'application/pdf',
  createdAt: '2026-04-07T19:34:25.000Z',
  content: `Investigating Privacy Leakage in Machine Learning Models

1. Problem and Motivation

The use of machine learning models in sensitive areas like healthcare, finance, and education is on the rise. These models are often trained on personal data that includes confidential or identifiable information. While models do not store raw data directly, research shows that they may still disclose or allow attackers to infer sensitive details from training data through memorization, inference attacks, or generated outputs.`
};

type AppState = {
  docs: DocItem[];
  selectedDocId: string;
  activeDocIds: string[];
  model: string;
  readingLevel: ReadingLevel;
  fontSize: number;
  lineSpacing: number;
  dyslexia: boolean;
  focusMode: boolean;
  reduceJargon: boolean;
  dark: boolean;
  flashcardCount: number;
};

const readingOptions: ReadingLevel[] = ['Grade 2', 'Grade 4', 'Grade 6', 'High School', 'College'];

function saveState(state: AppState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): AppState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function LearnAbleApp() {
  const [docs, setDocs] = useState<DocItem[]>([defaultDoc]);
  const [selectedDocId, setSelectedDocId] = useState(defaultDoc.id);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([defaultDoc.id]);

  const [model, setModel] = useState('phi:latest');
  const [models, setModels] = useState<string[]>(['phi:latest']);
  const [health, setHealth] = useState<HealthResult | null>(null);

  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('High School');
  const [fontSize, setFontSize] = useState(15);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [dyslexia, setDyslexia] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [reduceJargon, setReduceJargon] = useState(false);
  const [dark, setDark] = useState(false);
  const [flashcardCount, setFlashcardCount] = useState(8);

  const [notesDraft, setNotesDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'podcast' | 'chat' | 'settings'>('settings');
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [podcast, setPodcast] = useState<PodcastResult | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Ask a question about the selected files and I will answer using only those files.' }
  ]);
  const [chatChunks, setChatChunks] = useState<ChunkMatch[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [modeLabel, setModeLabel] = useState<'ai' | 'demo'>('demo');
  const [loading, setLoading] = useState<'summary' | 'flashcards' | 'podcast' | 'chat' | 'models' | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setDocs(saved.docs?.length ? saved.docs : [defaultDoc]);
      setSelectedDocId(saved.selectedDocId || defaultDoc.id);
      setActiveDocIds(saved.activeDocIds?.length ? saved.activeDocIds : [defaultDoc.id]);
      setModel(saved.model || 'phi:latest');
      setReadingLevel(saved.readingLevel || 'High School');
      setFontSize(saved.fontSize ?? 15);
      setLineSpacing(saved.lineSpacing ?? 1.6);
      setDyslexia(!!saved.dyslexia);
      setFocusMode(!!saved.focusMode);
      setReduceJargon(!!saved.reduceJargon);
      setDark(!!saved.dark);
      setFlashcardCount(saved.flashcardCount ?? 8);
    }
  }, []);

  useEffect(() => {
    saveState({
      docs, selectedDocId, activeDocIds, model, readingLevel,
      fontSize, lineSpacing, dyslexia, focusMode, reduceJargon, dark, flashcardCount
    });
  }, [docs, selectedDocId, activeDocIds, model, readingLevel, fontSize, lineSpacing, dyslexia, focusMode, reduceJargon, dark, flashcardCount]);

  useEffect(() => {
    document.body.className = dark ? 'dark' : '';
  }, [dark]);

  useEffect(() => {
    async function boot() {
      setLoading('models');
      try {
        const [healthRes, modelRes] = await Promise.all([
          fetch('/api/health', { cache: 'no-store' }),
          fetch('/api/models', { cache: 'no-store' })
        ]);
        const healthJson = await healthRes.json();
        const modelJson = await modelRes.json();
        setHealth(healthJson);
        setModeLabel(healthJson?.mode || 'demo');
        if (Array.isArray(modelJson.models) && modelJson.models.length) {
          setModels(modelJson.models);
          if (!modelJson.models.includes(model)) setModel(modelJson.models[0]);
        }
      } catch (e: any) {
        setError(e?.message || 'Could not connect to local services.');
      } finally {
        setLoading(null);
      }
    }
    boot();
  }, []);

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedDocId) || docs[0], [docs, selectedDocId]);
  const activeDocs = useMemo(() => docs.filter((d) => activeDocIds.includes(d.id)), [docs, activeDocIds]);
  const combinedText = useMemo(() => combineDocs(docs, activeDocIds), [docs, activeDocIds]);

  const readingStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: lineSpacing,
    letterSpacing: dyslexia ? '0.08em' : 'normal',
    fontFamily: dyslexia ? 'Arial, Verdana, sans-serif' : 'inherit'
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedDocs: DocItem[] = [];

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        uploadedDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: json.name,
          content: json.content || '',
          createdAt: new Date().toISOString(),
          type: json.type || file.type || 'application/octet-stream'
        });
      } catch (err: any) {
        setError(`Failed to upload ${file.name}: ${err?.message || 'unknown error'}`);
      }
    }

    if (uploadedDocs.length) {
      setDocs((prev) => [...uploadedDocs, ...prev]);
      setSelectedDocId(uploadedDocs[0].id);
      setActiveDocIds(uploadedDocs.map((d) => d.id));
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function addNotes() {
    if (!notesDraft.trim()) return;
    const next: DocItem = {
      id: `doc-${Date.now()}`,
      name: `Notes ${docs.length + 1}.md`,
      content: notesDraft.trim(),
      createdAt: new Date().toISOString(),
      type: 'text/markdown'
    };
    setDocs((prev) => [next, ...prev]);
    setSelectedDocId(next.id);
    setActiveDocIds([next.id]);
    setNotesDraft('');
  }

  function toggleDocSelection(docId: string, multi = false) {
    if (multi) {
      setActiveDocIds((prev) => prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]);
      setSelectedDocId(docId);
      return;
    }
    setSelectedDocId(docId);
    setActiveDocIds([docId]);
  }

  async function runSummary() {
    if (!combinedText.trim()) { setError('No document selected.'); return; }
    setLoading('summary'); setActiveTab('summary'); setError('');
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, model, readingLevel, reduceJargon })
      });
      const json = await res.json();
      setSummary({ title: json?.title || 'Summary', bullets: Array.isArray(json?.bullets) ? json.bullets : [], paragraph: json?.paragraph || '' });
      setModeLabel(json?.mode || modeLabel);
    } catch (err: any) {
      setError(err?.message || 'Summary failed.');
    } finally { setLoading(null); }
  }

  async function runFlashcards() {
    if (!combinedText.trim()) { setError('No document selected.'); return; }
    setLoading('flashcards'); setActiveTab('flashcards'); setError('');
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, model, readingLevel, reduceJargon, count: flashcardCount })
      });
      const json = await res.json();
      setFlashcards(Array.isArray(json?.cards) ? json.cards : []);
      setModeLabel(json?.mode || modeLabel);
    } catch (err: any) {
      setError(err?.message || 'Flashcards failed.');
    } finally { setLoading(null); }
  }

  async function runPodcast() {
    if (!combinedText.trim()) { setError('No document selected.'); return; }
    setLoading('podcast'); setActiveTab('podcast'); setError('');
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, model, readingLevel, reduceJargon })
      });
      const json = await res.json();
      setPodcast({ title: json?.title || 'Study Podcast', intro: json?.intro || '', segments: Array.isArray(json?.segments) ? json.segments : [], outro: json?.outro || '' });
      setModeLabel(json?.mode || modeLabel);
    } catch (err: any) {
      setError(err?.message || 'Podcast failed.');
    } finally { setLoading(null); }
  }

  function speakPodcast() {
    if (!podcast || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const text = [podcast.title, podcast.intro, ...(Array.isArray(podcast.segments) ? podcast.segments : []), podcast.outro].join(' ');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  async function sendChat() {
    if (!chatDraft.trim() || activeDocs.length === 0) { setError('Select at least one document and enter a question.'); return; }
    const nextMessages: ChatMessage[] = [...chat, { role: 'user', content: chatDraft.trim() }];
    setChat(nextMessages); setChatDraft(''); setLoading('chat'); setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, readingLevel, reduceJargon, messages: nextMessages, docs: activeDocs.map((d) => ({ name: d.name, content: d.content })) })
      });
      const json = await res.json();
      setChat([...nextMessages, { role: 'assistant', content: json?.reply || 'No response.' }]);
      setChatChunks(Array.isArray(json?.chunks) ? json.chunks : []);
      setModeLabel(json?.mode || modeLabel);
    } catch (err: any) {
      setChat([...nextMessages, { role: 'assistant', content: 'I could not answer because the request failed.' }]);
      setError(err?.message || 'Chat failed.');
    } finally { setLoading(null); }
  }

  function exportText(name: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`app-shell ${dark ? 'dark' : ''}`} style={readingStyle}>
      <section className="hero">
        <div className="hero-top">
          <div>
            <div className="badge">{modeLabel === 'ai' ? 'AI mode' : 'Demo mode'}</div>
            <div className="title">LearnAble Full Ready App</div>
            <div className="subtitle">Multi-file local study workspace with Ollama support, grounded chat, flashcards, podcast scripts, and accessibility controls.</div>
          </div>
          <div className="hero-actions">
            <button className="primary-btn" onClick={runSummary}>Make Summary</button>
            <button className="ghost-btn" onClick={runFlashcards}>Make Flashcards</button>
            <button className="ghost-btn" onClick={runPodcast}>Make Podcast</button>
            <button className="ghost-btn" onClick={() => setDark((d) => !d)}>{dark ? 'Light' : 'Dark'} Mode</button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-box"><div className="stat-label">Current model</div><div className="stat-value">{model}</div></div>
          <div className="stat-box"><div className="stat-label">Reading level</div><div className="stat-value">{readingLevel}</div></div>
          <div className="stat-box"><div className="stat-label">Selected files</div><div className="stat-value">{activeDocs.length}</div></div>
          <div className="stat-box"><div className="stat-label">Mode</div><div className="stat-value">{modeLabel === 'ai' ? 'AI' : 'Demo'}</div></div>
        </div>
      </section>

      <div className="main-grid">
        <aside className="card stretch">
          <div className="card-title">Source materials</div>
          <div className="card-subtitle">Upload files, paste notes, and choose one or many files.</div>
          <button className="ghost-btn side-button" onClick={() => fileRef.current?.click()}>Upload PDF, DOCX, TXT, or MD</button>
          <input ref={fileRef} type="file" hidden multiple accept=".pdf,.docx,.txt,.md" onChange={handleUpload} />
          <button className="ghost-btn side-button" onClick={() => setNotesDraft('')}>New Notes</button>
          <textarea className="textarea" placeholder="Paste notes, lecture text, transcript, or study guide..." value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
          <button className="primary-btn side-button" onClick={addNotes}>Save notes</button>
          <div className="small-actions">
            <button className="ghost-btn" onClick={() => setActiveDocIds(docs.map((d) => d.id))}>Select All</button>
            <button className="ghost-btn" onClick={() => setActiveDocIds([])}>Clear</button>
          </div>
          <div className="selection-pill">Using {activeDocs.length} document{activeDocs.length === 1 ? '' : 's'}</div>
          <div className="file-list">
            {docs.map((doc) => (
              <div key={doc.id} className={`file-item ${activeDocIds.includes(doc.id) ? 'active' : ''}`} onClick={(e) => toggleDocSelection(doc.id, e.metaKey || e.ctrlKey)}>
                <div className="file-top">
                  <div className="file-name">{doc.name}</div>
                  <input
                    type="checkbox"
                    checked={activeDocIds.includes(doc.id)}
                    onChange={(e) => { e.stopPropagation(); toggleDocSelection(doc.id, true); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="file-meta">saved · {formatDateStable(doc.createdAt)}</div>
                <div className="file-preview">{doc.content.slice(0, 220)}...</div>
              </div>
            ))}
          </div>
        </aside>

        <main>
          <section className="card">
            <div className="tab-row">
              {(['summary', 'flashcards', 'podcast', 'chat', 'settings'] as const).map((tab) => (
                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            <div className="workspace-box" style={{ maxWidth: focusMode ? '760px' : '100%', margin: focusMode ? '0 auto' : '0', padding: focusMode ? '28px' : '18px' }}>
              {error ? <div className="error">{error}</div> : null}
              {loading ? <div className="loading">Working with {modeLabel === 'ai' ? 'local AI' : 'demo mode'}...</div> : null}

              {activeTab === 'summary' && (
                <>
                  <div className="output-title">Summary</div>
                  {summary ? (
                    <div>
                      <ul className="output-list">{summary.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                      <p>{summary.paragraph}</p>
                      <div className="small-actions">
                        <button className="ghost-btn" onClick={() => exportText('summary.txt', `${summary.title}\n\n${summary.bullets.join('\n')}\n\n${summary.paragraph}`)}>Export Summary</button>
                      </div>
                    </div>
                  ) : <div className="small-muted">Generate a summary from the selected files.</div>}
                </>
              )}

              {activeTab === 'flashcards' && (
                <>
                  <div className="output-title">Flashcards</div>
                  {flashcards.length ? (
                    <div className="flashcard-grid">
                      {flashcards.map((card, idx) => (
                        <div className="flashcard" key={idx}>
                          <q>{card.question}</q>
                          <div>{card.answer}</div>
                        </div>
                      ))}
                      <div className="small-actions">
                        <button className="ghost-btn" onClick={() => exportText('flashcards.txt', flashcards.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n'))}>Export Flashcards</button>
                      </div>
                    </div>
                  ) : <div className="small-muted">Generate flashcards from the selected files.</div>}
                </>
              )}

              {activeTab === 'podcast' && (
                <>
                  <div className="output-title">Podcast Script</div>
                  {podcast ? (
                    <div>
                      <p><strong>{podcast.title}</strong></p>
                      <p>{podcast.intro}</p>
                      <ul className="output-list">{Array.isArray(podcast.segments) && podcast.segments.map((segment, idx) => <li key={idx}>{segment}</li>)}</ul>
                      <p>{podcast.outro}</p>
                      <div className="small-actions">
                        <button className="ghost-btn" onClick={speakPodcast}>Play Script</button>
                        <button className="ghost-btn" onClick={() => exportText('podcast-script.txt', [podcast.title, podcast.intro, ...(Array.isArray(podcast.segments) ? podcast.segments : []), podcast.outro].join('\n\n'))}>Export Script</button>
                      </div>
                    </div>
                  ) : <div className="small-muted">Generate an audio-friendly review script from the selected files.</div>}
                </>
              )}

              {activeTab === 'chat' && (
                <div className="chat-wrap">
                  <div className="chat-log">
                    {chat.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.content}</div>)}
                  </div>
                  <div className="chat-input-row">
                    <input className="input" placeholder="Ask about the selected files..." value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
                    <button className="primary-btn" onClick={sendChat}>Send</button>
                  </div>
                  {chatChunks.length ? (
                    <div className="chunk-list">
                      {chatChunks.map((chunk) => (
                        <div className="chunk-box" key={`${chunk.docName}-${chunk.id}`}>
                          <div className="chunk-head">Source {chunk.id} · {chunk.docName} · score {chunk.score}</div>
                          <div className="small-muted">{chunk.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="small-muted">Choose the local model, reading level, accessibility settings, and flashcard count below.</div>
              )}
            </div>

            <div className="settings-box">
              <div className="card-title">Accessibility and study settings</div>
              <div className="card-subtitle">Control reading support and flashcard count.</div>

              <div className="field">
                <label>Local model</label>
                <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Reading level</label>
                <div className="level-row">
                  {readingOptions.map((level) => (
                    <button key={level} className={`chip-btn ${readingLevel === level ? 'active' : ''}`} onClick={() => setReadingLevel(level)}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Flashcards: {flashcardCount}</label>
                <div className="range-wrap">
                  <input type="range" min={3} max={20} value={flashcardCount} onChange={(e) => setFlashcardCount(Number(e.target.value))} />
                </div>
              </div>

              <div className="field">
                <label>Font size: {fontSize}px</label>
                <div className="range-wrap">
                  <input type="range" min={12} max={28} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
                </div>
              </div>

              <div className="field">
                <label>Line spacing: {lineSpacing.toFixed(1)}</label>
                <div className="range-wrap">
                  <input type="range" min={1} max={3} step={0.1} value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))} />
                </div>
              </div>

              <div className="checkbox-row">
                <input id="dyslexia" type="checkbox" checked={dyslexia} onChange={(e) => setDyslexia(e.target.checked)} />
                <label htmlFor="dyslexia">Dyslexia-friendly reading</label>
              </div>

              <div className="checkbox-row">
                <input id="focusMode" type="checkbox" checked={focusMode} onChange={(e) => setFocusMode(e.target.checked)} />
                <label htmlFor="focusMode">Focus mode</label>
              </div>

              <div className="checkbox-row">
                <input id="reduceJargon" type="checkbox" checked={reduceJargon} onChange={(e) => setReduceJargon(e.target.checked)} />
                <label htmlFor="reduceJargon">{reduceJargon ? 'Simple language ON' : 'Reduce jargon'}</label>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>Local AI health</label>
                {health?.ok ? <div className="health-ok">Connected to Ollama at {health.baseUrl}</div> : <div className="health-bad">{health?.message || 'Ollama not detected. Demo mode is active.'}</div>}
              </div>
            </div>
          </section>
        </main>

        <aside className="card stretch">
          <div className="card-title">Selected sources</div>
          <div className="card-subtitle">Preview one file or the combined selected set.</div>

          <div className="right-doc-box">
            <div className="file-name">{activeDocs.length === 1 ? activeDocs[0]?.name : `${activeDocs.length} selected files`}</div>
            <div className="small-muted">
              {activeDocs.length === 1 ? `saved · ${activeDocs[0] ? formatDateStable(activeDocs[0].createdAt) : ''}` : 'Combined study context'}
            </div>
          </div>

          <div className="preview-scroll" style={{ maxWidth: focusMode ? '620px' : '100%', margin: focusMode ? '0 auto' : '0', lineHeight: focusMode ? lineSpacing + 0.4 : lineSpacing, padding: focusMode ? '30px' : '18px' }}>
            {activeDocs.length <= 1 ? (selectedDoc?.content || '') : combinedText}
          </div>
        </aside>
      </div>
    </div>
  );
}
