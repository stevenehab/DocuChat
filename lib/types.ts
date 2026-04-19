export type DocItem = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  type: string;
};

export type ReadingLevel = 'Grade 2' | 'Grade 4' | 'Grade 6' | 'High School' | 'College';

export type SummaryResult = {
  title: string;
  bullets: string[];
  paragraph: string;
};

export type Flashcard = {
  question: string;
  answer: string;
};

export type PodcastResult = {
  title: string;
  intro: string;
  segments: string[];
  outro: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChunkMatch = {
  id: number;
  score: number;
  text: string;
  docName: string;
};

export type HealthResult = {
  ok: boolean;
  models: string[];
  baseUrl: string;
  mode: 'ai' | 'demo';
  message?: string;
};
