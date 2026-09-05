'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Spinner, Empty, ProgressBar } from '@/components/ui';
import { getMcqPool, pickQuestions } from '@/lib/data';
import { recordAttempt, recordQuiz, weakCategories, openMistakes, dueToday } from '@/lib/store';
import { CATEGORY_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { Mcq, CategoryId } from '@/lib/types';

type Phase = 'setup' | 'running' | 'done';
type Mode = 'daily' | 'custom' | 'mistakes' | 'revision';

function QuizInner() {
  const { lang, T, update, state } = useApp();
  const params = useSearchParams();

  const [pool, setPool] = useState<Mcq[] | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState<Mode>('daily');
  const [useWeak, setUseWeak] = useState(false);
  const [qs, setQs] = useState<Mcq[]>([]);
  const [cur, setCur] = useState(0);
  const [chosen, setChosen] = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [qStart, setQStart] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { getMcqPool(21).then(setPool); }, []);

  useEffect(() => {
    const n = Number(params.get('n'));
    if ([10, 20, 30].includes(n)) setSize(n);
    if (params.get('focus') === 'weak') setUseWeak(true);
    const m = params.get('mode');
    if (m === 'mistakes' || m === 'revision') setMode(m);
  }, [params]);

  // Live timer, but only while a quiz is actually running.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  const weak = useMemo(() => weakCategories(state).map((w) => w.category), [state]);
  const mistakeIds = useMemo(() => new Set(openMistakes(state).map((m) => m.mcqId)), [state]);
  const dueArticleIds = useMemo(() => new Set(dueToday(state).map((d) => d.articleId)), [state]);

  const available = useMemo(() => {
    if (!pool) return [];
    if (mode === 'mistakes') return pool.filter((q) => mistakeIds.has(q.id));
    if (mode === 'revision') return pool.filter((q) => dueArticleIds.has(q.articleId));
    return pool;
  }, [pool, mode, mistakeIds, dueArticleIds]);

  const start = useCallback(() => {
    const bias: CategoryId[] | undefined = useWeak && weak.length ? weak : undefined;
    const picked = mode === 'daily' || mode === 'custom'
      ? pickQuestions(available, size, state.profile, bias)
      : available.slice(0, size);
    if (!picked.length) return;
    setQs(picked);
    setChosen(new Array(picked.length).fill(null));
    setCur(0);
    setRevealed(false);
    const now = Date.now();
    setStartedAt(now); setQStart(now); setElapsed(0);
    setPhase('running');
  }, [available, size, state.profile, useWeak, weak, mode]);

  const answer = (i: number) => {
    if (revealed) return;
    const q = qs[cur];
    setChosen((prev) => { const n = [...prev]; n[cur] = i; return n; });
    setRevealed(true);
    update((s) =>
      recordAttempt(s, {
        mcqId: q.id, articleId: q.articleId, correct: i === q.answer, chosen: i, answer: q.answer,
        seconds: Math.max(1, Math.round((Date.now() - qStart) / 1000)), categories: q.categories,
      })
    );
  };

  const next = () => {
    if (cur + 1 >= qs.length) {
      const byCategory: Record<string, { seen: number; right: number }> = {};
      let correct = 0;
      qs.forEach((q, i) => {
        const right = chosen[i] === q.answer;
        if (right) correct++;
        for (const c of q.categories) {
          byCategory[c] = byCategory[c] || { seen: 0, right: 0 };
          byCategory[c].seen++;
          if (right) byCategory[c].right++;
        }
      });
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      update((s) => recordQuiz(s, { size: qs.length, correct, seconds, byCategory, mode }));
      setPhase('done');
      return;
    }
    setCur((c) => c + 1);
    setRevealed(false);
    setQStart(Date.now());
  };

  if (pool === null) return <Spinner label={T('loading')} />;

  // ------------------------------ setup ------------------------------------
  if (phase === 'setup') {
    return (
      <div className="max-w-xl rise">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('dailyQuiz')}</h1>
        <p className="text-[13px] text-faint mb-5">
          {available.length} {lang === 'hi' ? 'प्रश्न उपलब्ध' : 'questions available'}
        </p>

        <div className="card p-4 mb-3">
          <div className="label mb-2">{lang === 'hi' ? 'प्रश्न स्रोत' : 'Question set'}</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['daily', lang === 'hi' ? 'सभी' : 'All recent', pool.length],
              ['mistakes', T('mistakes'), pool.filter((q) => mistakeIds.has(q.id)).length],
              ['revision', T('revision'), pool.filter((q) => dueArticleIds.has(q.articleId)).length],
            ] as const).map(([m, label, n]) => (
              <button key={m} onClick={() => setMode(m as Mode)} disabled={n === 0}
                className={`p-2.5 rounded-lg border text-[13px] transition-colors disabled:opacity-40 ${mode === m ? 'border-brand bg-brandsoft text-brand font-medium' : 'border-line'}`}>
                <div>{label}</div>
                <div className="text-[11px] text-faint mt-0.5 tabular-nums">{n}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4 mb-3">
          <div className="label mb-2">{lang === 'hi' ? 'प्रश्नों की संख्या' : 'Number of questions'}</div>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 30].map((n) => (
              <button key={n} onClick={() => setSize(n)}
                className={`py-2.5 rounded-lg border text-[15px] font-medium transition-colors ${size === n ? 'border-brand bg-brandsoft text-brand' : 'border-line'}`}>
                {n}
              </button>
            ))}
          </div>
          {available.length < size && available.length > 0 && (
            <p className="text-[12px] text-warm mt-2">
              {lang === 'hi'
                ? `केवल ${available.length} प्रश्न उपलब्ध हैं — क्विज़ उतने की ही होगी।`
                : `Only ${available.length} available — the quiz will be that long.`}
            </p>
          )}
        </div>

        {weak.length > 0 && mode === 'daily' && (
          <label className="card p-4 mb-4 flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={useWeak} onChange={(e) => setUseWeak(e.target.checked)} className="mt-0.5 accent-[rgb(var(--brand))]" />
            <div>
              <div className="text-[14px] font-medium">{lang === 'hi' ? 'कमज़ोर विषयों पर ज़ोर' : 'Weight toward my weak topics'}</div>
              <div className="text-[12px] text-faint mt-0.5">
                {weak.slice(0, 3).map((c) => t(CATEGORY_MAP[c]?.label as any, lang)).join(', ')}
              </div>
            </div>
          </label>
        )}

        {available.length === 0 ? (
          <Empty>
            {mode === 'mistakes'
              ? (lang === 'hi' ? 'कोई अनसुलझी गलती नहीं। 👏' : 'No open mistakes. 👏')
              : mode === 'revision'
              ? (lang === 'hi' ? 'आज रिवीज़न बकाया नहीं।' : 'Nothing due for revision.')
              : T('noQuestions')}
          </Empty>
        ) : (
          <button onClick={start} className="btn btn-primary w-full justify-center !py-3 text-[15px]">
            {T('startQuiz')} · {Math.min(size, available.length)} {T('questions')}
          </button>
        )}
      </div>
    );
  }

  // ----------------------------- running -----------------------------------
  if (phase === 'running') {
    const q = qs[cur];
    const options = lang === 'hi' && q.options.hi?.length === 4 ? q.options.hi : q.options.en;
    const picked = chosen[cur];
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    return (
      <div className="max-w-xl rise">
        <div className="flex items-center justify-between text-[13px] mb-2">
          <span className="font-medium tabular-nums">{T('question')} {cur + 1} / {qs.length}</span>
          <span className="tabular-nums text-faint">{mm}:{ss}</span>
        </div>
        <ProgressBar value={((cur + (revealed ? 1 : 0)) / qs.length) * 100} />

        <div className="card p-4 mt-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {q.categories.slice(0, 2).map((c) => (
              <span key={c} className="chip">{t(CATEGORY_MAP[c]?.label as any, lang) || c}</span>
            ))}
            <span className="chip">{q.difficulty}</span>
          </div>

          <p className={`text-[15.5px] font-medium leading-relaxed whitespace-pre-line mb-4 ${lang === 'hi' ? 'hi' : ''}`}>
            {t(q.question, lang)}
          </p>

          <div className="space-y-1.5">
            {options.map((opt, i) => {
              let cls = 'border-line hover:border-brand/50';
              if (revealed) {
                if (i === q.answer) cls = 'border-good bg-good/[0.08] text-good';
                else if (i === picked) cls = 'border-hot bg-hot/[0.08] text-hot';
                else cls = 'border-line opacity-55';
              }
              return (
                <button key={i} onClick={() => answer(i)} disabled={revealed}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-[14px] leading-snug transition-colors flex gap-2.5 ${cls}`}>
                  <span className="shrink-0 font-semibold w-4">{String.fromCharCode(97 + i)}.</span>
                  <span className={lang === 'hi' ? 'hi' : ''}>{opt}</span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-3.5 rise">
              <p className={`text-[13px] font-semibold mb-1.5 ${picked === q.answer ? 'text-good' : 'text-hot'}`}>
                {picked === q.answer ? `✓ ${T('correct')}` : `✕ ${T('incorrect')}`}
              </p>
              <div className="rounded-lg bg-brandsoft/60 border border-line p-3">
                <div className="label mb-1">{T('explanation')}</div>
                <p className={`text-[13.5px] leading-relaxed text-muted ${lang === 'hi' ? 'hi' : ''}`}>{t(q.explanation, lang)}</p>
              </div>
              <Link href={`/news/${q.articleId}`} className="link text-[12.5px] mt-2 inline-block">
                {lang === 'hi' ? 'मूल समाचार पढ़ें' : 'Read the source article'} →
              </Link>
            </div>
          )}
        </div>

        {revealed && (
          <button onClick={next} className="btn btn-primary w-full justify-center mt-3 !py-3">
            {cur + 1 >= qs.length ? T('finish') : T('next')} →
          </button>
        )}
      </div>
    );
  }

  // ------------------------------- done ------------------------------------
  const correct = qs.filter((q, i) => chosen[i] === q.answer).length;
  const pct = Math.round((correct / qs.length) * 100);
  const wrong = qs.map((q, i) => ({ q, chosen: chosen[i] })).filter((x) => x.chosen !== x.q.answer);

  const catBreak = new Map<CategoryId, { seen: number; right: number }>();
  qs.forEach((q, i) => {
    for (const c of q.categories) {
      const cur = catBreak.get(c) || { seen: 0, right: 0 };
      cur.seen++;
      if (chosen[i] === q.answer) cur.right++;
      catBreak.set(c, cur);
    }
  });

  return (
    <div className="max-w-xl rise">
      <div className="card p-5 text-center mb-4">
        <div className={`text-5xl font-semibold tabular-nums ${pct >= 70 ? 'text-good' : pct >= 50 ? 'text-warm' : 'text-hot'}`}>{pct}%</div>
        <p className="text-[14px] text-muted mt-1">{correct} / {qs.length} {T('correct').toLowerCase()}</p>
        <p className="text-[12px] text-faint mt-1 tabular-nums">
          {T('timeTaken')}: {Math.floor(elapsed / 60)}m {elapsed % 60}s · {Math.round(elapsed / qs.length)}s / {lang === 'hi' ? 'प्रश्न' : 'question'}
        </p>
      </div>

      <div className="card p-4 mb-4">
        <div className="label mb-2.5">{lang === 'hi' ? 'विषयवार प्रदर्शन' : 'By category'}</div>
        <div className="space-y-2.5">
          {[...catBreak.entries()].sort((a, b) => a[1].right / a[1].seen - b[1].right / b[1].seen).map(([c, v]) => (
            <div key={c}>
              <div className="flex justify-between text-[13px] mb-1">
                <span>{t(CATEGORY_MAP[c]?.label as any, lang) || c}</span>
                <span className="tabular-nums text-faint">{v.right}/{v.seen}</span>
              </div>
              <ProgressBar value={(v.right / v.seen) * 100} tone={v.right / v.seen >= 0.7 ? 'good' : v.right / v.seen >= 0.5 ? 'warm' : 'hot'} />
            </div>
          ))}
        </div>
      </div>

      {wrong.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="label mb-2">
            {wrong.length} {lang === 'hi' ? 'गलत — गलती पुस्तिका में जोड़े गए' : 'wrong — added to your Mistake Book'}
          </div>
          <ul className="space-y-2">
            {wrong.slice(0, 6).map(({ q, chosen: ch }) => (
              <li key={q.id} className="text-[13px] border-b border-line last:border-0 pb-2 last:pb-0">
                <p className={`font-medium leading-snug line-clamp-2 ${lang === 'hi' ? 'hi' : ''}`}>{t(q.question, lang)}</p>
                <p className="text-[12px] mt-1">
                  <span className="text-hot">{T('yourAnswer')}: {String.fromCharCode(97 + (ch ?? 0))}</span>
                  <span className="mx-1.5 text-faint">·</span>
                  <span className="text-good">{T('rightAnswer')}: {String.fromCharCode(97 + q.answer)}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setPhase('setup'); setQs([]); }} className="btn justify-center">{T('retry')}</button>
        <Link href="/mistakes" className="btn btn-primary justify-center">{T('reviewMistakes')}</Link>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return <Suspense fallback={<Spinner />}><QuizInner /></Suspense>;
}
