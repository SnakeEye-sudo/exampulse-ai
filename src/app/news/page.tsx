'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { ArticleCard } from '@/components/ArticleCard';
import { Empty, Spinner } from '@/components/ui';
import { rankForUser, applyFocusMode } from '@/lib/data';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { CategoryId, Priority } from '@/lib/types';

function NewsInner() {
  const { index, dataReady, lang, state, T } = useApp();
  const params = useSearchParams();
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [date, setDate] = useState<string>('all');
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    const p = params.get('priority') as Priority | null;
    const c = params.get('cat') as CategoryId | null;
    if (p) setPriority(p);
    if (c) setCat(c);
  }, [params]);

  const dates = useMemo(() => [...new Set(index.map((r) => r.date))].sort().reverse().slice(0, 30), [index]);

  const filtered = useMemo(() => {
    let list = index;
    if (cat !== 'all') list = list.filter((r) => r.categories.includes(cat));
    if (priority !== 'all') list = list.filter((r) => r.priority === priority);
    if (date !== 'all') list = list.filter((r) => r.date === date);
    return applyFocusMode(rankForUser(list, state.profile), state.profile.focusMode);
  }, [index, cat, priority, date, state.profile]);

  // Category counts help a student see where the day's weight actually sits,
  // instead of guessing which filter is worth tapping.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of index) for (const c of r.categories) m.set(c, (m.get(c) || 0) + 1);
    return m;
  }, [index]);

  useEffect(() => { setLimit(30); }, [cat, priority, date]);

  if (!dataReady) return <Spinner label={T('loading')} />;

  return (
    <div className="rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('news')}</h1>
      <p className="text-[13px] text-faint mb-4">
        {filtered.length} {T('articles')}
        {state.profile.focusMode && ` · ${T('focusMode')}`}
      </p>

      <div className="space-y-2.5 mb-5">
        <div className="scroll-x -mx-4 px-4">
          <div className="flex gap-1.5 w-max pb-1">
            <button onClick={() => setCat('all')}
              className={`chip !normal-case !text-[12px] whitespace-nowrap ${cat === 'all' ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
              {T('all')} ({index.length})
            </button>
            {CATEGORIES.filter((c) => counts.get(c.id)).map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className={`chip !normal-case !text-[12px] whitespace-nowrap ${cat === c.id ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
                {t(c.label, lang)} ({counts.get(c.id)})
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)}
            className="rounded-md border border-line bg-raised px-2.5 py-1.5 text-[13px]">
            <option value="all">{T('priority')}: {T('all')}</option>
            <option value="high">{T('high')}</option>
            <option value="medium">{T('medium')}</option>
            <option value="low">{T('low')}</option>
          </select>
          <select value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-line bg-raised px-2.5 py-1.5 text-[13px]">
            <option value="all">{lang === 'hi' ? 'सभी तिथियाँ' : 'All dates'}</option>
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {(cat !== 'all' || priority !== 'all' || date !== 'all') && (
            <button onClick={() => { setCat('all'); setPriority('all'); setDate('all'); }} className="btn !py-1.5 text-[13px]">
              {T('clearAll')}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty>{T('nothingYet')}</Empty>
      ) : (
        <>
          <div className="space-y-2.5">
            {filtered.slice(0, limit).map((a) => <ArticleCard key={a.id} a={a} lang={lang} />)}
          </div>
          {filtered.length > limit && (
            <button onClick={() => setLimit((l) => l + 30)} className="btn w-full justify-center mt-4">
              {lang === 'hi' ? 'और दिखाएँ' : 'Show more'} ({filtered.length - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function NewsPage() {
  return <Suspense fallback={<Spinner />}><NewsInner /></Suspense>;
}
