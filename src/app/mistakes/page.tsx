'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { McqBlock } from '@/components/McqBlock';
import { Empty, Spinner } from '@/components/ui';
import { getMcqPool } from '@/lib/data';
import { openMistakes } from '@/lib/store';
import { CATEGORY_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { Mcq } from '@/lib/types';

export default function MistakesPage() {
  const { state, update, lang, T, hydrated } = useApp();
  const [pool, setPool] = useState<Mcq[] | null>(null);
  const [showCleared, setShowCleared] = useState(false);

  useEffect(() => { getMcqPool(60).then(setPool); }, []);

  const open = useMemo(() => openMistakes(state), [state]);
  const cleared = useMemo(() => state.mistakes.filter((m) => m.clearedAt), [state.mistakes]);

  const byId = useMemo(() => new Map((pool || []).map((q) => [q.id, q])), [pool]);
  const list = (showCleared ? cleared : open)
    .map((m) => ({ m, q: byId.get(m.mcqId) }))
    .filter((x): x is { m: typeof x.m; q: Mcq } => Boolean(x.q));

  if (!hydrated || pool === null) return <Spinner label={T('loading')} />;

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('mistakes')}</h1>
      <p className="text-[13px] text-faint mb-4">
        {lang === 'hi'
          ? 'हर गलत उत्तर यहाँ स्वतः आता है और तभी हटता है जब आप उसे दोबारा सही करते हैं।'
          : 'Every wrong answer lands here automatically, and only leaves when you get it right on a later attempt.'}
      </p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setShowCleared(false)}
          className={`btn !py-1.5 text-[13px] ${!showCleared ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
          {lang === 'hi' ? 'अनसुलझी' : 'Open'} ({open.length})
        </button>
        <button onClick={() => setShowCleared(true)}
          className={`btn !py-1.5 text-[13px] ${showCleared ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
          {T('cleared')} ({cleared.length})
        </button>
        {open.length > 0 && (
          <Link href="/quiz?mode=mistakes" className="btn btn-primary !py-1.5 text-[13px] ml-auto">
            {lang === 'hi' ? 'दोबारा टेस्ट' : 'Retest these'}
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <Empty>
          {showCleared
            ? (lang === 'hi' ? 'अभी कोई सुधरी हुई गलती नहीं।' : 'No cleared mistakes yet.')
            : (lang === 'hi' ? 'कोई अनसुलझी गलती नहीं। शानदार।' : 'No open mistakes. Good.')}
        </Empty>
      ) : (
        <div className="space-y-4">
          {list.map(({ m, q }) => (
            <div key={m.mcqId}>
              <div className="flex flex-wrap items-center gap-2 mb-1.5 text-[12px]">
                <span className={`chip ${m.clearedAt ? 'border-good/40 text-good' : 'border-hot/40 text-hot'}`}>
                  {m.times}× {T('timesWrong')}
                </span>
                {q.categories.slice(0, 2).map((c) => (
                  <span key={c} className="chip">{t(CATEGORY_MAP[c]?.label as any, lang) || c}</span>
                ))}
                <Link href={`/news/${m.articleId}`} className="link ml-auto">
                  {lang === 'hi' ? 'स्रोत' : 'Source article'} →
                </Link>
              </div>
              <McqBlock mcq={q} lang={lang} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
