'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Empty, ProgressBar, Spinner } from '@/components/ui';
import { categoryStats, overallAccuracy, last7DaysActivity, openMistakes, dueToday, daysToExam } from '@/lib/store';
import { CATEGORY_MAP, EXAM_MAP, SRS_LADDER } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';

export default function ProgressPage() {
  const { state, lang, T, hydrated } = useApp();

  const stats = useMemo(() => categoryStats(state), [state]);
  const acc = overallAccuracy(state);
  const week = useMemo(() => last7DaysActivity(state), [state]);
  const mistakes = openMistakes(state);
  const due = dueToday(state);
  const dte = daysToExam(state.profile);
  const quizzes = [...state.quizzes].reverse().slice(0, 10);
  const mastered = state.revision.filter((r) => r.stage >= SRS_LADDER.length).length;

  const avgSeconds = useMemo(() => {
    if (!state.attempts.length) return 0;
    return Math.round(state.attempts.reduce((n, a) => n + a.seconds, 0) / state.attempts.length);
  }, [state.attempts]);

  if (!hydrated) return <Spinner label={T('loading')} />;

  if (acc.seen === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">{T('progress')}</h1>
        <Empty>
          {lang === 'hi'
            ? 'अभी कोई डेटा नहीं। एक क्विज़ दें — उसके बाद यहाँ सटीकता, कमज़ोर विषय और समय-प्रबंधन का पूरा विश्लेषण दिखेगा।'
            : 'No data yet. Attempt one quiz and this page fills with accuracy, weak topics and pacing analysis.'}
        </Empty>
        <Link href="/quiz" className="btn btn-primary mt-3">{T('startQuiz')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('progress')}</h1>
      <p className="text-[13px] text-faint mb-5">
        {EXAM_MAP[state.profile.primaryExam] ? t(EXAM_MAP[state.profile.primaryExam].label, lang) : ''}
        {dte !== null && dte >= 0 && ` · D−${dte}`}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        <div className="card p-3">
          <div className={`text-2xl font-semibold tabular-nums ${acc.pct >= 70 ? 'text-good' : acc.pct >= 50 ? 'text-warm' : 'text-hot'}`}>{acc.pct}%</div>
          <div className="label mt-1">{T('accuracy')}</div>
        </div>
        <div className="card p-3"><div className="text-2xl font-semibold tabular-nums">{acc.seen}</div><div className="label mt-1">{T('questions')}</div></div>
        <div className="card p-3"><div className="text-2xl font-semibold tabular-nums">{avgSeconds}s</div><div className="label mt-1">{lang === 'hi' ? 'औसत समय' : 'Avg / question'}</div></div>
        <div className="card p-3"><div className="text-2xl font-semibold tabular-nums text-good">{mastered}</div><div className="label mt-1">{lang === 'hi' ? 'महारत' : 'Mastered'}</div></div>
      </div>

      <section className="mb-7">
        <h2 className="label mb-2.5">{lang === 'hi' ? 'पिछले 7 दिन' : 'Last 7 days'}</h2>
        <div className="card p-4">
          <div className="flex items-end gap-2 h-24">
            {week.map((d) => {
              const max = Math.max(1, ...week.map((x) => x.attempts));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-faint tabular-nums">{d.attempts || ''}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                    <div className="w-full rounded-t bg-good/70" style={{ height: `${(d.correct / max) * 100}%` }} />
                    <div className="w-full rounded-b bg-hot/50" style={{ height: `${((d.attempts - d.correct) / max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-faint">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-faint">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-good/70" />{T('correct')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-hot/50" />{T('incorrect')}</span>
          </div>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="label mb-1">{lang === 'hi' ? 'विषयवार विश्लेषण' : 'Topic-wise analysis'}</h2>
        <p className="text-[12px] text-faint mb-2.5">
          {lang === 'hi'
            ? 'क्रम "आत्मविश्वास सीमा" से — 3 में 3 सही होना 20 में 16 सही होने से कमज़ोर प्रमाण है।'
            : 'Ordered by confidence bound, not raw accuracy — 3/3 is weaker evidence of mastery than 16/20.'}
        </p>
        <div className="card p-4 space-y-3">
          {stats.map((s) => (
            <div key={s.category}>
              <div className="flex items-baseline justify-between text-[13px] mb-1">
                <span className="font-medium">{t(CATEGORY_MAP[s.category]?.label as any, lang) || s.category}</span>
                <span className="tabular-nums text-faint">
                  {s.right}/{s.seen} · {Math.round(s.accuracy * 100)}%
                  {s.seen < 4 && <span className="ml-1 text-warm">({lang === 'hi' ? 'कम डेटा' : 'low data'})</span>}
                </span>
              </div>
              <ProgressBar value={s.accuracy * 100} tone={s.accuracy >= 0.7 ? 'good' : s.accuracy >= 0.5 ? 'warm' : 'hot'} />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="label mb-2.5">{lang === 'hi' ? 'हाल की क्विज़' : 'Recent quizzes'}</h2>
        {quizzes.length === 0 ? <Empty>{T('nothingYet')}</Empty> : (
          <div className="card divide-y divide-line">
            {quizzes.map((q) => {
              const pct = Math.round((q.correct / q.size) * 100);
              return (
                <div key={q.id} className="flex items-center gap-3 p-3 text-[13px]">
                  <span className={`font-semibold tabular-nums w-11 ${pct >= 70 ? 'text-good' : pct >= 50 ? 'text-warm' : 'text-hot'}`}>{pct}%</span>
                  <span className="text-muted tabular-nums">{q.correct}/{q.size}</span>
                  <span className="chip">{q.mode}</span>
                  <span className="ml-auto text-faint tabular-nums text-[12px]">
                    {Math.floor(q.seconds / 60)}m · {new Date(q.at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/mistakes" className="card p-4 hover:border-brand/50">
          <div className={`text-2xl font-semibold tabular-nums ${mistakes.length ? 'text-hot' : 'text-good'}`}>{mistakes.length}</div>
          <div className="label mt-1">{T('mistakes')}</div>
        </Link>
        <Link href="/revision" className="card p-4 hover:border-brand/50">
          <div className={`text-2xl font-semibold tabular-nums ${due.length ? 'text-hot' : 'text-good'}`}>{due.length}</div>
          <div className="label mt-1">{T('revisionDue')}</div>
        </Link>
      </div>
    </div>
  );
}
