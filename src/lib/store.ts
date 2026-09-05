'use client';

import type {
  UserState, UserProfile, Attempt, RevisionCard, MistakeEntry, QuizResult,
  CategoryId, ExamId, Lang,
} from './types';
import { SRS_LADDER } from './taxonomy';

const KEY = 'exampulse.state.v1';
const CURRENT_VERSION = 1;

// ---------------------------------------------------------------------------
// Everything a student does lives on their own device. No account, no server,
// no data leaving the browser. The cost of that choice is that progress does
// not follow them to another phone — which is why export/import exists below.
// ---------------------------------------------------------------------------

export const todayIso = (): string => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return f.format(new Date());
};

/**
 * Bucket a timestamp by Indian calendar day.
 *
 * `iso.slice(0, 10)` is the UTC date, and IST is UTC+5:30 — so anything studied
 * after 18:30 IST would be filed under the previous day. For an app whose whole
 * premise is daily streaks and "what did I do today", that is not a rounding
 * error, it is wrong every single evening.
 */
export const istDateOf = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
};

export const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00+05:30`);
  d.setDate(d.getDate() + n);
  return todayIsoFrom(d);
};

const todayIsoFrom = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(`${b}T00:00:00+05:30`).getTime() - new Date(`${a}T00:00:00+05:30`).getTime()) / 86400000);

export function defaultProfile(): UserProfile {
  return {
    name: '', exams: ['UPSC'], primaryExam: 'UPSC', state: null, examDate: null,
    lang: 'en', focusMode: false, onboarded: false, createdAt: new Date().toISOString(),
  };
}

export function emptyState(): UserState {
  return {
    profile: defaultProfile(),
    attempts: [], revision: [], mistakes: [], quizzes: [], reads: [], bookmarks: [],
    streak: { current: 0, best: 0, lastActiveDate: null },
    version: CURRENT_VERSION,
  };
}

export function loadState(): UserState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<UserState>;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile || {}) },
      streak: { ...base.streak, ...(parsed.streak || {}) },
      attempts: parsed.attempts || [],
      revision: parsed.revision || [],
      mistakes: parsed.mistakes || [],
      quizzes: parsed.quizzes || [],
      reads: parsed.reads || [],
      bookmarks: parsed.bookmarks || [],
      version: CURRENT_VERSION,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(s: UserState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Quota exhausted: shed the oldest attempts rather than losing the profile,
    // which is the part the student cannot reconstruct.
    try {
      const trimmed: UserState = { ...s, attempts: s.attempts.slice(-600), reads: s.reads.slice(-400) };
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch { /* give up silently; the session still works in memory */ }
  }
}

// --------------------------------- streak ----------------------------------

export function touchStreak(s: UserState): UserState {
  const today = todayIso();
  const last = s.streak.lastActiveDate;
  if (last === today) return s;
  const gap = last ? daysBetween(last, today) : Infinity;
  const current = gap === 1 ? s.streak.current + 1 : 1;
  return {
    ...s,
    streak: { current, best: Math.max(current, s.streak.best), lastActiveDate: today },
  };
}

// ------------------------------ spaced repetition ---------------------------

/**
 * Reading an article schedules it. The ladder is 1 → 3 → 7 → 15 → 30 days;
 * a wrong answer on a question from that article knocks it back a rung, because
 * "I read it" and "I can recall it under time pressure" are different things.
 */
export function scheduleArticle(s: UserState, articleId: string): UserState {
  if (s.revision.some((r) => r.articleId === articleId)) return s;
  const today = todayIso();
  const card: RevisionCard = {
    articleId, stage: 0, dueOn: addDays(today, SRS_LADDER[0]),
    addedOn: today, lastReviewed: null, lapses: 0,
  };
  return { ...s, revision: [...s.revision, card] };
}

export function advanceRevision(s: UserState, articleId: string): UserState {
  const today = todayIso();
  return {
    ...s,
    revision: s.revision.map((r) => {
      if (r.articleId !== articleId) return r;
      const stage = Math.min(r.stage + 1, SRS_LADDER.length);
      const dueOn = stage >= SRS_LADDER.length ? '9999-12-31' : addDays(today, SRS_LADDER[stage]);
      return { ...r, stage, dueOn, lastReviewed: today };
    }),
  };
}

export function demoteRevision(s: UserState, articleId: string): UserState {
  const today = todayIso();
  const exists = s.revision.some((r) => r.articleId === articleId);
  const next = exists ? s : scheduleArticle(s, articleId);
  return {
    ...next,
    revision: next.revision.map((r) => {
      if (r.articleId !== articleId) return r;
      const stage = Math.max(0, r.stage - 1);
      return { ...r, stage, dueOn: addDays(today, SRS_LADDER[stage]), lapses: r.lapses + 1 };
    }),
  };
}

export function dueToday(s: UserState): RevisionCard[] {
  const today = todayIso();
  return s.revision
    .filter((r) => r.stage < SRS_LADDER.length && r.dueOn <= today)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || b.lapses - a.lapses);
}

// --------------------------------- attempts ---------------------------------

export function recordAttempt(
  s: UserState,
  a: Omit<Attempt, 'id' | 'at'>
): UserState {
  const attempt: Attempt = { ...a, id: `${a.mcqId}-${Date.now()}`, at: new Date().toISOString() };
  let next: UserState = { ...s, attempts: [...s.attempts, attempt] };

  if (a.correct) {
    // Clearing a mistake requires getting it right after having got it wrong.
    next = {
      ...next,
      mistakes: next.mistakes.map((m) =>
        m.mcqId === a.mcqId && !m.clearedAt ? { ...m, clearedAt: new Date().toISOString() } : m
      ),
    };
  } else {
    const existing = next.mistakes.find((m) => m.mcqId === a.mcqId);
    const entry: MistakeEntry = existing
      ? { ...existing, times: existing.times + 1, lastWrongAt: new Date().toISOString(), clearedAt: null }
      : { mcqId: a.mcqId, articleId: a.articleId, times: 1, lastWrongAt: new Date().toISOString(), clearedAt: null };
    next = {
      ...next,
      mistakes: [...next.mistakes.filter((m) => m.mcqId !== a.mcqId), entry],
    };
    next = demoteRevision(next, a.articleId);
  }
  return touchStreak(next);
}

export function recordQuiz(s: UserState, q: Omit<QuizResult, 'id' | 'at'>): UserState {
  const result: QuizResult = { ...q, id: `q-${Date.now()}`, at: new Date().toISOString() };
  return touchStreak({ ...s, quizzes: [...s.quizzes, result] });
}

export function markRead(s: UserState, articleId: string): UserState {
  const already = s.reads.some((r) => r.articleId === articleId);
  const withRead = already ? s : { ...s, reads: [...s.reads, { articleId, at: new Date().toISOString() }] };
  return touchStreak(scheduleArticle(withRead, articleId));
}

export function toggleBookmark(s: UserState, articleId: string): UserState {
  const has = s.bookmarks.includes(articleId);
  return { ...s, bookmarks: has ? s.bookmarks.filter((b) => b !== articleId) : [...s.bookmarks, articleId] };
}

// ------------------------------ weakness analysis ----------------------------

export interface CategoryStat {
  category: CategoryId;
  seen: number;
  right: number;
  accuracy: number;
  /** Wilson lower bound: stops 1-from-1 looking like mastery. */
  confidence: number;
}

/**
 * Raw accuracy over three questions is noise. The Wilson lower bound answers
 * the question that actually matters — "what is the worst my true accuracy
 * plausibly is?" — so a topic needs both a low score and enough attempts
 * before it is called a weakness.
 */
function wilsonLower(right: number, n: number): number {
  if (n === 0) return 0;
  const z = 1.96;
  const p = right / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Math.max(0, (centre - margin) / denom);
}

export function categoryStats(s: UserState): CategoryStat[] {
  const acc = new Map<CategoryId, { seen: number; right: number }>();
  for (const a of s.attempts) {
    for (const c of a.categories) {
      const cur = acc.get(c) || { seen: 0, right: 0 };
      cur.seen++;
      if (a.correct) cur.right++;
      acc.set(c, cur);
    }
  }
  return [...acc.entries()]
    .map(([category, v]) => ({
      category,
      seen: v.seen,
      right: v.right,
      accuracy: v.seen ? v.right / v.seen : 0,
      confidence: wilsonLower(v.right, v.seen),
    }))
    .sort((a, b) => a.confidence - b.confidence);
}

export function weakCategories(s: UserState, minSeen = 4): CategoryStat[] {
  return categoryStats(s).filter((c) => c.seen >= minSeen && c.accuracy < 0.7);
}

export function overallAccuracy(s: UserState): { seen: number; right: number; pct: number } {
  const seen = s.attempts.length;
  const right = s.attempts.filter((a) => a.correct).length;
  return { seen, right, pct: seen ? Math.round((right / seen) * 100) : 0 };
}

export function last7DaysActivity(s: UserState): { date: string; attempts: number; correct: number }[] {
  const out: { date: string; attempts: number; correct: number }[] = [];
  const today = todayIso();
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const dayAttempts = s.attempts.filter((a) => istDateOf(a.at) === d);
    out.push({ date: d, attempts: dayAttempts.length, correct: dayAttempts.filter((x) => x.correct).length });
  }
  return out;
}

export function openMistakes(s: UserState): MistakeEntry[] {
  return s.mistakes.filter((m) => !m.clearedAt).sort((a, b) => b.times - a.times || b.lastWrongAt.localeCompare(a.lastWrongAt));
}

export function daysToExam(p: UserProfile): number | null {
  if (!p.examDate) return null;
  return daysBetween(todayIso(), p.examDate);
}

// ------------------------------- portability --------------------------------

export function exportState(s: UserState): string {
  return JSON.stringify({ ...s, exportedAt: new Date().toISOString(), app: 'ExamPulse AI' }, null, 2);
}

export function importState(json: string): UserState | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.profile) return null;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      streak: { ...base.streak, ...(parsed.streak || {}) },
      version: CURRENT_VERSION,
    };
  } catch {
    return null;
  }
}

export type { UserState, UserProfile, Attempt, RevisionCard, MistakeEntry, QuizResult, CategoryId, ExamId, Lang };
