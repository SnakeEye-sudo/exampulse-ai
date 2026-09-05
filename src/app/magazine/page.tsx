'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Empty, Spinner, Stars } from '@/components/ui';
import { getMonth, getRecentArticles } from '@/lib/data';
import { t } from '@/lib/i18n';
import { CATEGORY_MAP } from '@/lib/taxonomy';
import type { Article } from '@/lib/types';

type Tab = 'weekly' | 'monthly';

export default function MagazinePage() {
  const { manifest, dataReady, lang, T, state } = useApp();
  const [tab, setTab] = useState<Tab>('weekly');
  const [month, setMonth] = useState<string>('');
  const [monthData, setMonthData] = useState<any>(null);
  const [weekArticles, setWeekArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    if (manifest?.months?.length && !month) setMonth(manifest.months[manifest.months.length - 1]);
  }, [manifest, month]);

  useEffect(() => { if (month) getMonth(month).then(setMonthData); }, [month]);
  useEffect(() => { getRecentArticles(7).then(setWeekArticles); }, []);

  const weekly = useMemo(() => {
    if (!weekArticles) return null;
    const sorted = [...weekArticles].sort((a, b) => b.relevance.score - a.relevance.score);
    const sections = new Map<string, Article[]>();
    for (const a of sorted) {
      const c = a.categories[0] || 'national';
      sections.set(c, [...(sections.get(c) || []), a]);
    }
    return {
      total: weekArticles.length,
      high: weekArticles.filter((a) => a.relevance.priority === 'high').length,
      mcqs: weekArticles.reduce((n, a) => n + a.mcqs.length, 0),
      top: sorted.slice(0, 12),
      sections: [...sections.entries()].sort((a, b) => b[1].length - a[1].length),
      facts: sorted.filter((a) => a.relevance.score >= 4).flatMap((a) => a.staticFacts.map((f) => ({ ...f, id: a.id }))).slice(0, 25),
    };
  }, [weekArticles]);

  if (!dataReady || weekArticles === null) return <Spinner label={T('loading')} />;

  return (
    <div className="max-w-3xl rise">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{T('magazine')}</h1>
          <p className="text-[13px] text-faint mt-0.5">
            {lang === 'hi' ? 'संग्रहित समाचारों से स्वतः संकलित रिवीज़न सामग्री।' : 'Revision material auto-compiled from the archive.'}
          </p>
        </div>
        <button onClick={() => window.print()} className="btn !py-1.5 text-[13px] no-print shrink-0">
          {lang === 'hi' ? 'प्रिंट / PDF' : 'Print / PDF'}
        </button>
      </div>

      <div className="flex gap-2 mb-5 no-print">
        {(['weekly', 'monthly'] as Tab[]).map((x) => (
          <button key={x} onClick={() => setTab(x)}
            className={`btn !py-1.5 text-[13px] ${tab === x ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
            {x === 'weekly' ? (lang === 'hi' ? 'साप्ताहिक डाइजेस्ट' : 'Weekly digest') : (lang === 'hi' ? 'मासिक मैगज़ीन' : 'Monthly magazine')}
          </button>
        ))}
        {tab === 'monthly' && (manifest?.months?.length || 0) > 0 && (
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-line bg-raised px-2.5 py-1.5 text-[13px] ml-auto">
            {manifest!.months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {tab === 'weekly' && weekly && (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            <div className="card p-3"><div className="text-2xl font-semibold tabular-nums">{weekly.total}</div><div className="label mt-1">{T('articles')}</div></div>
            <div className="card p-3"><div className="text-2xl font-semibold tabular-nums text-hot">{weekly.high}</div><div className="label mt-1">{T('high')}</div></div>
            <div className="card p-3"><div className="text-2xl font-semibold tabular-nums text-brand">{weekly.mcqs}</div><div className="label mt-1">{T('questions')}</div></div>
          </div>

          <section className="mb-7">
            <h2 className="label mb-2.5">{lang === 'hi' ? 'सप्ताह की प्रमुख घटनाएँ' : 'The week that mattered'}</h2>
            <ol className="card divide-y divide-line">
              {weekly.top.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/news/${a.id}`} className="flex gap-3 p-3 hover:bg-brandsoft/40">
                    <span className="shrink-0 text-[11px] font-bold text-faint tabular-nums w-5 mt-0.5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className={`text-[14px] font-medium leading-snug ${lang === 'hi' ? 'hi' : ''}`}>{t(a.title, lang)}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-faint">
                        <Stars score={a.relevance.score} size={10} />
                        <span>{a.date}</span>
                        <span className="truncate">{a.source.name}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {weekly.facts.length > 0 && (
            <section className="mb-7">
              <h2 className="label mb-2.5">{lang === 'hi' ? 'रटने योग्य तथ्य' : 'Facts to memorise'}</h2>
              <ul className="card p-4 space-y-2">
                {weekly.facts.map((f, i) => (
                  <li key={i} className={`text-[13.5px] leading-relaxed flex gap-2 ${lang === 'hi' ? 'hi' : ''}`}>
                    <span className="text-warm shrink-0">•</span>
                    <Link href={`/news/${f.id}`} className="hover:text-brand">{t(f.point, lang)}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === 'monthly' && (
        !monthData || !monthData.sections?.length ? (
          <Empty>{lang === 'hi' ? 'इस महीने के लिए पर्याप्त डेटा नहीं।' : 'Not enough archived data for this month yet.'}</Empty>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="card p-3"><div className="text-2xl font-semibold tabular-nums">{monthData.totalArticles}</div><div className="label mt-1">{T('articles')}</div></div>
              <div className="card p-3"><div className="text-2xl font-semibold tabular-nums text-hot">{monthData.highPriority}</div><div className="label mt-1">{T('high')}</div></div>
              <div className="card p-3"><div className="text-2xl font-semibold tabular-nums text-brand">{monthData.mcqs?.length || 0}</div><div className="label mt-1">{T('questions')}</div></div>
            </div>

            {monthData.sections.map((sec: any) => (
              <section key={sec.category} className="mb-7">
                <h2 className="text-[15px] font-semibold mb-2 pb-1.5 border-b border-line">
                  {t(sec.label, lang)} <span className="text-faint font-normal text-[13px]">({sec.count})</span>
                </h2>
                <ul className="space-y-2.5">
                  {sec.articles.map((a: any) => (
                    <li key={a.id}>
                      <Link href={`/news/${a.id}`} className="group">
                        <p className={`text-[14px] font-medium leading-snug group-hover:text-brand ${lang === 'hi' ? 'hi' : ''}`}>
                          {t(a.title, lang)}
                        </p>
                      </Link>
                      <p className={`text-[13px] text-muted leading-relaxed mt-0.5 ${lang === 'hi' ? 'hi' : ''}`}>{t(a.summary, lang)}</p>
                      {a.staticFacts?.length > 0 && (
                        <ul className="mt-1.5 ml-3 space-y-1">
                          {a.staticFacts.map((f: any, i: number) => (
                            <li key={i} className={`text-[12.5px] text-muted flex gap-1.5 ${lang === 'hi' ? 'hi' : ''}`}>
                              <span className="text-warm">▸</span>{t(f.point, lang)}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] text-faint mt-1">{a.date} · {a.sourceName}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {monthData.mcqs?.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold mb-2 pb-1.5 border-b border-line">
                  {lang === 'hi' ? 'प्रश्न बैंक' : 'Question bank'} ({monthData.mcqs.length})
                </h2>
                <Link href="/quiz" className="btn btn-primary mt-2 no-print">{T('startQuiz')}</Link>
                <ol className="mt-4 space-y-4">
                  {monthData.mcqs.slice(0, 40).map((m: any, i: number) => (
                    <li key={m.id}>
                      <p className={`text-[13.5px] font-medium whitespace-pre-line ${lang === 'hi' ? 'hi' : ''}`}>
                        {i + 1}. {t(m.question, lang)}
                      </p>
                      <ol className="mt-1 ml-4 text-[13px] text-muted space-y-0.5">
                        {(lang === 'hi' && m.options.hi?.length === 4 ? m.options.hi : m.options.en).map((o: string, j: number) => (
                          <li key={j} className={j === m.answer ? 'text-good font-medium' : ''}>
                            ({String.fromCharCode(97 + j)}) {o}
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
