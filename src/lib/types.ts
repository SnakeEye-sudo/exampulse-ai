// ---------------------------------------------------------------------------
// ExamPulse AI — core domain types
// Every content object carries provenance. Nothing is displayed without a source.
// ---------------------------------------------------------------------------

export type Lang = 'en' | 'hi';

/** Bilingual string. `hi` may be empty when translation was unavailable. */
export interface Bi {
  en: string;
  hi: string;
}

export type CategoryId =
  | 'national' | 'international' | 'polity' | 'economy' | 'scitech'
  | 'environment' | 'defence' | 'agriculture' | 'health' | 'education'
  | 'judiciary' | 'awards' | 'appointments' | 'reports' | 'sports'
  | 'days' | 'schemes' | 'state';

export type ExamId =
  | 'UPSC' | 'BPSC' | 'STATE_PCS' | 'SSC' | 'BANKING'
  | 'RAILWAY' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'CUSTOM';

export type Priority = 'high' | 'medium' | 'low';

/**
 * How much we trust the underlying claim.
 *  primary  — government / regulator / official body published it themselves
 *  verified — established news organisation with a stable editorial process
 *  unverified — aggregator or single unconfirmed report; shown with a warning
 */
export type VerificationStatus = 'primary' | 'verified' | 'unverified';

export interface SourceRef {
  id: string;
  name: string;
  url: string;
  homepage: string;
  publishedAt: string | null;
  retrievedAt: string;
  verification: VerificationStatus;
  /** True when an LLM enriched the analysis around this source's facts. */
  aiProcessed: boolean;
  /** Independent outlets that carried the same story — the cheapest real check. */
  corroboration?: { name: string; url: string }[];
  /** Issuing ministry / department, for primary government releases. */
  ministry?: string | null;
}

export interface StaticFact {
  point: Bi;
  /** Optional grouping, e.g. "Constitutional provision", "Organisation" */
  kind?: string;
}

export interface OrgRef {
  name: string;
  note: Bi;
}

export interface TermRef {
  term: string;
  meaning: Bi;
}

export interface SyllabusLink {
  exam: ExamId;
  paper: string;
  topic: string;
}

export type McqType =
  | 'statement' | 'multiple-correct' | 'match' | 'assertion-reason'
  | 'chronology' | 'static-link' | 'direct';

export interface Mcq {
  id: string;
  articleId: string;
  type: McqType;
  question: Bi;
  options: { en: string[]; hi: string[] };
  /** Index into options array. */
  answer: number;
  explanation: Bi;
  difficulty: 'easy' | 'medium' | 'hard';
  categories: CategoryId[];
  exams: ExamId[];
  /** Denormalised for the mistake book / revision UI. */
  articleTitle?: Bi;
}

export interface Article {
  id: string;
  slug: string;
  date: string;              // YYYY-MM-DD (ingestion day)
  title: Bi;
  /** 1. What happened */
  summary: Bi;
  /** 2. Why it is important */
  whyImportant: Bi;
  /** 3. Why it can matter in an examination */
  examAngle: Bi;
  /** 4/5. Background + static GK to revise */
  background: Bi;
  staticFacts: StaticFact[];
  organisations: OrgRef[];
  terminology: TermRef[];
  /** 15. Previous-year-question pattern connection */
  pyq: Bi | null;

  categories: CategoryId[];
  /** Lowercase state slug when state-specific, else null. */
  state: string | null;
  tags: string[];

  relevance: { score: 1 | 2 | 3 | 4 | 5; priority: Priority; rationale: Bi };
  exams: ExamId[];
  syllabus: SyllabusLink[];

  mcqs: Mcq[];
  source: SourceRef;
  ingestedAt: string;
  /** Set when enrichment failed and only raw feed data is present. */
  degraded?: boolean;
}

export interface DayFile {
  date: string;
  generatedAt: string;
  articles: Article[];
}

export interface IndexRecord {
  id: string;
  date: string;
  title: Bi;
  summary: Bi;
  categories: CategoryId[];
  state: string | null;
  score: number;
  priority: Priority;
  exams: ExamId[];
  tags: string[];
  sourceName: string;
  verification: VerificationStatus;
  mcqCount: number;
}

export interface Manifest {
  generatedAt: string;
  dates: string[];
  months: string[];
  totalArticles: number;
  totalMcqs: number;
  sources: { name: string; count: number; verification: VerificationStatus }[];
  pipelineVersion: string;
  aiEnabled: boolean;
}

// --------------------------- user-side (local) -----------------------------

export interface UserProfile {
  name: string;
  exams: ExamId[];
  primaryExam: ExamId;
  customExamName?: string;
  state: string | null;
  examDate: string | null;    // YYYY-MM-DD
  lang: Lang;
  focusMode: boolean;         // "Serious Aspirant Mode"
  onboarded: boolean;
  createdAt: string;
}

export interface Attempt {
  id: string;
  mcqId: string;
  articleId: string;
  correct: boolean;
  chosen: number;
  answer: number;
  seconds: number;
  at: string;
  categories: CategoryId[];
}

/** Spaced repetition: Day 1 → 3 → 7 → 15 → 30, then retired. */
export interface RevisionCard {
  articleId: string;
  stage: number;              // 0..5 (5 = mastered)
  dueOn: string;              // YYYY-MM-DD
  addedOn: string;
  lastReviewed: string | null;
  lapses: number;
}

export interface MistakeEntry {
  mcqId: string;
  articleId: string;
  times: number;
  lastWrongAt: string;
  clearedAt: string | null;
}

export interface QuizResult {
  id: string;
  at: string;
  size: number;
  correct: number;
  seconds: number;
  byCategory: Record<string, { seen: number; right: number }>;
  mode: 'daily' | 'custom' | 'mistakes' | 'revision';
}

export interface ReadEntry { articleId: string; at: string }

export interface UserState {
  profile: UserProfile;
  attempts: Attempt[];
  revision: RevisionCard[];
  mistakes: MistakeEntry[];
  quizzes: QuizResult[];
  reads: ReadEntry[];
  bookmarks: string[];
  streak: { current: number; best: number; lastActiveDate: string | null };
  version: number;
}
