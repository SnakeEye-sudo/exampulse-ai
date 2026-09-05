'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { ArticleCard } from '@/components/ArticleCard';
import { Empty, Spinner, Stars } from '@/components/ui';
import { searchIndex, getArticlesByIds } from '@/lib/data';
import { CATEGORY_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { Article } from '@/lib/types';

/**
 * Topic search, not headline search. A student typing "repo rate" wants the
 * whole picture: what happened, the background, how it has moved over time, the
 * static facts, and what could be asked — assembled from everything we hold on
 * the topic rather than one article.
 */
export default function SearchPage() {
  const { index, dataReady, lang, T } = useApp();
  const [q, setQ] = useState('');
  const [deep, setDeep] = useState<Article[]>([]);

  const results = useMemo(() => (q.trim().length >= 2 ? searchIndex(index, q) : []), [index, q]);

  useEffect(() => {
    if (results.length === 0) { setDeep([]); return; }
    let alive = true;
    getArticlesByIds(results.slice(0, 8).map((r) => r.id)).then((a) => { if (alive) setDeep(a); });
    return () => { alive = false; };
  }, [results]);

  const dossier = useMemo(() => {
    if (!deep.length) return null;
    const facts = deep.flatMap((a) => a.staticFacts.map((f) => ({ ...f, from: a.id })));
    const orgs = new Map<string, { name: string; note: any }>();
    const terms = new Map<string, { term: string; meaning: any }>();
    for (const a of deep) {
      for (const o of a.organisations) if (!orgs.has(o.name)) orgs.set(o.name, o);
      for (const tm of a.terminology) if (!terms.has(tm.term)) terms.set(tm.term, tm);
    }
    const timeline = [...deep].sort((a, b) => a.date.localeCompare(b.date));
    const questions = deep.flatMap((a) => a.mcqs).slice(0, 6);
    const cats = [...new Set(deep.flatMap((a) => a.categories))];
    const exams = [...new Set(deep.flatMap((a) => a.exams))];
    const topScore = Math.max(...deep.map((a) => a.relevance.score));
    const related = [...new Set(deep.flatMap((a) => a.tags))].slice(0, 12);
    return { facts: facts.slice(0, 10), orgs: [...orgs.values()], terms: [...terms.values()], timeline, questions, cats, exams, topScore, related };
  }, [deep]);

  if (!dataReady) return <Spinner label={T('loading')} />;

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-3">{T('search')}</h1>

      <input
        autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={lang === 'hi' ? 'विषय खोजें — रेपो रेट, अनुच्छेद 370, PM-KISAN…' : 'Search a topic — repo rate, Article 370, PM-KISAN…'}
        className="w-full rounded-lg border border-line bg-raised px-4 py-3 text-[15px] focus:border-brand outline-none"
      />

      {q.trim().length >= 2 && (
        <p className="text-[13px] text-faint mt-2.5">
          {results.length} {lang === 'hi' ? 'परिणाम' : 'results'}
        </p>
      )}

      {q.trim().length >= 2 && results.length === 0 && (
        <Empty>
          {lang === 'hi'
            ? 'कोई परिणाम नहीं। यह ऐप केवल उन्हीं दिनों का डेटा रखता है जब से यह चल रहा है — पुराने विषय अभी उपलब्ध नहीं होंगे।'
            : 'No results. This app only holds the days it has been running for, so older topics may simply not be in the archive yet.'}
        </Empty>
      )}

      {dossier && (
        <div className="card p-4 mt-5 border-brand/25 bg-brandsoft/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="label text-brand">{lang === 'hi' ? 'विषय सार' : 'Topic dossier'}</span>
            <Stars score={dossier.topScore} />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {dossier.cats.map((c) => (
              <span key={c} className="chip">{t(CATEGORY_MAP[c]?.label as any, lang) || c}</span>
            ))}
            {dossier.exams.map((e) => <span key={e} className="chip border-brand/30 text-brand">{e}</span>)}
          </div>

          {dossier.timeline.length > 1 && (
            <div className="mb-4">
              <div className="label mb-1.5">{lang === 'hi' ? 'घटनाक्रम' : 'Timeline'}</div>
              <ol className="border-l-2 border-line ml-1 space-y-2">
                {dossier.timeline.map((a) => (
                  <li key={a.id} className="pl-3 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand" />
                    <Link href={`/news/${a.id}`} className="text-[13px] hover:text-brand">
                      <span className="tabular-nums text-faint mr-1.5">{a.date}</span>
                      <span className={lang === 'hi' ? 'hi' : ''}>{t(a.title, lang)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {dossier.facts.length > 0 && (
            <div className="mb-4">
              <div className="label mb-1.5">{T('staticGk')}</div>
              <ul className="space-y-1.5">
                {dossier.facts.map((f, i) => (
                  <li key={i} className={`text-[13.5px] leading-relaxed flex gap-2 ${lang === 'hi' ? 'hi' : ''}`}>
                    <span className="text-warm shrink-0">•</span>{t(f.point, lang)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dossier.terms.length > 0 && (
            <div className="mb-4">
              <div className="label mb-1.5">{T('terminology')}</div>
              <div className="space-y-1.5">
                {dossier.terms.map((tm, i) => (
                  <p key={i} className="text-[13px]">
                    <span className="font-semibold">{tm.term}</span>
                    <span className={`text-muted ${lang === 'hi' ? 'hi' : ''}`}> — {t(tm.meaning, lang)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {dossier.orgs.length > 0 && (
            <div className="mb-4">
              <div className="label mb-1.5">{T('organisations')}</div>
              <div className="space-y-1.5">
                {dossier.orgs.map((o, i) => (
                  <p key={i} className="text-[13px]">
                    <span className="font-semibold">{o.name}</span>
                    <span className={`text-muted ${lang === 'hi' ? 'hi' : ''}`}> — {t(o.note, lang)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {dossier.related.length > 0 && (
            <div>
              <div className="label mb-1.5">{lang === 'hi' ? 'संबंधित विषय' : 'Related topics'}</div>
              <div className="flex flex-wrap gap-1.5">
                {dossier.related.map((r) => (
                  <button key={r} onClick={() => setQ(r)} className="chip !normal-case hover:border-brand hover:text-brand">{r}</button>
                ))}
              </div>
            </div>
          )}

          <Link href={`/ask?q=${encodeURIComponent(q)}`} className="btn btn-primary w-full justify-center mt-4 text-[13px]">
            {lang === 'hi' ? 'इस विषय पर AI से पूछें' : 'Ask ExamPulse AI about this'} →
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-2.5">
          <div className="label">{lang === 'hi' ? 'संबंधित समाचार' : 'Matching articles'}</div>
          {results.slice(0, 25).map((r) => <ArticleCard key={r.id} a={r} lang={lang} compact />)}
        </div>
      )}
    </div>
  );
}
