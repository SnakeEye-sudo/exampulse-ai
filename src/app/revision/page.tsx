'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { ArticleCard } from '@/components/ArticleCard';
import { Empty, Spinner, ProgressBar } from '@/components/ui';
import { getArticlesByIds } from '@/lib/data';
import { dueToday, advanceRevision, todayIso, daysBetween } from '@/lib/store';
import { SRS_LADDER } from '@/lib/taxonomy';
import type { Article } from '@/lib/types';

export default function RevisionPage() {
  const { state, update, lang, T, hydrated } = useApp();
  const [articles, setArticles] = useState<Article[] | null>(null);

  const due = useMemo(() => dueToday(state), [state]);
  const upcoming = useMemo(() => {
    const today = todayIso();
    return state.revision
      .filter((r) => r.stage < SRS_LADDER.length && r.dueOn > today && r.dueOn !== '9999-12-31')
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }, [state.revision]);

  const mastered = state.revision.filter((r) => r.stage >= SRS_LADDER.length).length;

  useEffect(() => {
    if (!hydrated) return;
    getArticlesByIds(due.map((d) => d.articleId)).then(setArticles);
  }, [due, hydrated]);

  if (!hydrated || (due.length && articles === null)) return <Spinner label={T('loading')} />;

  const stageOf = (id: string) => state.revision.find((r) => r.articleId === id)?.stage ?? 0;

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('revision')}</h1>
      <p className="text-[13px] text-faint mb-5">
        {lang === 'hi'
          ? 'अंतराल-आधारित पुनरावृत्ति: दिन 1 → 3 → 7 → 15 → 30। सही याद रहने पर विषय अगले चरण में जाता है, गलत उत्तर पर एक चरण पीछे।'
          : 'Spaced repetition: day 1 → 3 → 7 → 15 → 30. Recall it and the topic moves up a rung; get a question on it wrong and it drops back one.'}
      </p>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <div className="card p-3">
          <div className={`text-2xl font-semibold tabular-nums ${due.length ? 'text-hot' : 'text-good'}`}>{due.length}</div>
          <div className="label mt-1">{T('revisionDue')}</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-semibold tabular-nums">{upcoming.length}</div>
          <div className="label mt-1">{lang === 'hi' ? 'आगामी' : 'Upcoming'}</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-semibold tabular-nums text-good">{mastered}</div>
          <div className="label mt-1">{lang === 'hi' ? 'पूर्ण' : 'Mastered'}</div>
        </div>
      </div>

      {due.length === 0 ? (
        <Empty>
          {lang === 'hi'
            ? 'आज रिवीज़न बकाया नहीं। समाचार पढ़ते ही वे स्वतः इस सूची में जुड़ जाएँगे।'
            : 'Nothing due today. Articles enter this schedule automatically the moment you read them.'}
        </Empty>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="label">{T('revisionDue')} ({due.length})</h2>
            <Link href="/quiz?mode=revision" className="link text-[13px]">
              {lang === 'hi' ? 'इन पर क्विज़' : 'Quiz on these'} →
            </Link>
          </div>
          <div className="space-y-2.5">
            {(articles || []).map((a) => {
              const st = stageOf(a.id);
              return (
                <div key={a.id}>
                  <ArticleCard a={a} lang={lang} />
                  <div className="flex items-center gap-3 px-4 py-2 -mt-1 border border-t-0 border-line rounded-b-lg bg-paper">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {SRS_LADDER.map((d, i) => (
                          <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded ${i < st ? 'bg-good/15 text-good' : i === st ? 'bg-brand text-white' : 'bg-line/60 text-faint'}`}>
                            D{d}
                          </span>
                        ))}
                      </div>
                      <ProgressBar value={(st / SRS_LADDER.length) * 100} tone="good" />
                    </div>
                    <button onClick={() => update((s) => advanceRevision(s, a.id))} className="btn !py-1.5 text-[13px] shrink-0">
                      ✓ {T('markRevised')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <div className="mt-8">
          <h2 className="label mb-2.5">{lang === 'hi' ? 'आगामी रिवीज़न' : 'Scheduled ahead'}</h2>
          <div className="card divide-y divide-line">
            {upcoming.slice(0, 12).map((r) => (
              <Link key={r.articleId} href={`/news/${r.articleId}`} className="flex items-center gap-3 p-3 text-[13px] hover:bg-brandsoft/40">
                <span className="chip shrink-0">D{SRS_LADDER[r.stage] ?? '—'}</span>
                <span className="flex-1 truncate text-muted">{r.articleId}</span>
                <span className="tabular-nums text-faint shrink-0">
                  {daysBetween(todayIso(), r.dueOn)}d
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
