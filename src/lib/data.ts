'use client';

import type { Article, DayFile, IndexRecord, Manifest, Mcq, ExamId, UserProfile, CategoryId } from './types';
import { EXAM_MAP } from './taxonomy';

const BASE = '/data';
const memo = new Map<string, unknown>();

async function getJson<T>(path: string, fallback: T): Promise<T> {
  if (memo.has(path)) return memo.get(path) as T;
  try {
    const res = await fetch(`${BASE}/${path}`, { cache: 'no-cache' });
    if (!res.ok) return fallback;
    const data = (await res.json()) as T;
    memo.set(path, data);
    return data;
  } catch {
    return fallback;
  }
}

export const getManifest = () =>
  getJson<Manifest>('manifest.json', {
    generatedAt: '', dates: [], months: [], totalArticles: 0, totalMcqs: 0,
    sources: [], pipelineVersion: '0', aiEnabled: false,
  });

export const getIndex = () => getJson<IndexRecord[]>('index.json', []);
export const getDay = (date: string) =>
  getJson<DayFile>(`day/${date}.json`, { date, generatedAt: '', articles: [] });
export const getMonth = (month: string) =>
  getJson<any>(`monthly/${month}.json`, { month, sections: [], mcqs: [], totalArticles: 0 });

/** Load the last `n` days of full articles, newest first. */
export async function getRecentArticles(n = 7): Promise<Article[]> {
  const m = await getManifest();
  const dates = m.dates.slice(-n).reverse();
  const days = await Promise.all(dates.map(getDay));
  return days.flatMap((d) => d.articles);
}

export async function getArticleById(id: string): Promise<Article | null> {
  const m = await getManifest();
  for (const date of [...m.dates].reverse()) {
    const day = await getDay(date);
    const hit = day.articles.find((a) => a.id === id);
    if (hit) return hit;
  }
  return null;
}

export async function getArticlesByIds(ids: string[]): Promise<Article[]> {
  if (!ids.length) return [];
  const want = new Set(ids);
  const m = await getManifest();
  const out: Article[] = [];
  for (const date of [...m.dates].reverse()) {
    if (!want.size) break;
    const day = await getDay(date);
    for (const a of day.articles) {
      if (want.has(a.id)) { out.push(a); want.delete(a.id); }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Personalised ranking.
//
// The same morning looks different to a BPSC aspirant and a Banking aspirant.
// This is where that happens: the pipeline's generic relevance score is only
// the starting point, re-weighted by the exams and state the student chose.
// ---------------------------------------------------------------------------

export function personalScore(a: Article | IndexRecord, profile: UserProfile): number {
  const base = ('relevance' in a ? a.relevance.score : a.score) as number;
  const cats = a.categories as CategoryId[];
  const exams = a.exams as ExamId[];

  const def = EXAM_MAP[profile.primaryExam];
  let weight = 1;
  if (def) {
    const applied = cats.map((c) => def.weights[c] ?? 1);
    weight = applied.length ? Math.max(...applied) : 1;
  }

  // Directly tagged for one of my exams — the strongest single signal.
  const tagged = exams.includes(profile.primaryExam) ? 1.35
    : exams.some((e) => profile.exams.includes(e)) ? 1.15
    : exams.length ? 0.85 : 1;

  // My state's news, when I'm sitting a state exam, beats most national news.
  const stateBoost =
    a.state && profile.state && a.state === profile.state
      ? (['BPSC', 'STATE_PCS', 'POLICE', 'TEACHING'] as ExamId[]).includes(profile.primaryExam) ? 1.5 : 1.15
      : a.state && profile.state && a.state !== profile.state ? 0.55
      : 1;

  const trust = ('source' in a ? a.source.verification : a.verification) === 'unverified' ? 0.85 : 1;

  return base * weight * tagged * stateBoost * trust;
}

export function rankForUser<T extends Article | IndexRecord>(items: T[], profile: UserProfile): T[] {
  return [...items]
    .map((a) => ({ a, s: personalScore(a, profile) }))
    .sort((x, y) => y.s - x.s || (y.a.date || '').localeCompare(x.a.date || ''))
    .map((x) => x.a);
}

export function applyFocusMode<T extends Article | IndexRecord>(items: T[], on: boolean): T[] {
  if (!on) return items;
  return items.filter((a) => {
    const score = 'relevance' in a ? a.relevance.score : a.score;
    const verification = 'source' in a ? a.source.verification : a.verification;
    return score >= 4 && verification !== 'unverified';
  });
}

// --------------------------------- questions --------------------------------

export async function getMcqPool(days = 14): Promise<Mcq[]> {
  const arts = await getRecentArticles(days);
  return arts.flatMap((a) => a.mcqs);
}

export function pickQuestions(pool: Mcq[], size: number, profile: UserProfile, bias?: CategoryId[]): Mcq[] {
  const def = EXAM_MAP[profile.primaryExam];
  const scored = pool.map((q) => {
    const w = def ? Math.max(...q.categories.map((c) => def.weights[c] ?? 1), 1) : 1;
    const examMatch = q.exams.includes(profile.primaryExam) ? 1.4 : q.exams.length ? 0.9 : 1;
    // A weak-topic bias is what turns a quiz into remediation instead of trivia.
    const weak = bias?.length && q.categories.some((c) => bias.includes(c)) ? 2.2 : 1;
    return { q, s: w * examMatch * weak * (0.75 + Math.random() * 0.5) };
  });
  scored.sort((a, b) => b.s - a.s);

  // Take from a wider band than we need, then shuffle, so the same student does
  // not see the same "best" ten questions every single morning.
  const band = scored.slice(0, Math.max(size, Math.min(scored.length, size * 3)));
  for (let i = band.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [band[i], band[j]] = [band[j], band[i]];
  }
  return band.slice(0, size).map((x) => x.q);
}

// ---------------------------------- search ----------------------------------

export function searchIndex(index: IndexRecord[], q: string): IndexRecord[] {
  const needle = q.toLowerCase().trim();
  if (needle.length < 2) return [];
  const terms = needle.split(/\s+/).filter(Boolean);
  return index
    .map((r) => {
      const hay = `${r.title.en} ${r.title.hi} ${r.summary.en} ${r.summary.hi} ${r.tags.join(' ')} ${r.categories.join(' ')}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (!hay.includes(term)) return { r, score: -1 };
        score += r.title.en.toLowerCase().includes(term) ? 3 : 1;
        if (r.tags.some((t) => t.toLowerCase().includes(term))) score += 2;
      }
      return { r, score: score + r.score * 0.4 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.r.date.localeCompare(a.r.date))
    .map((x) => x.r);
}
