'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { McqBlock } from '@/components/McqBlock';
import { Stars, VerificationBadge, PriorityChip, Spinner, Empty } from '@/components/ui';
import { getArticleById } from '@/lib/data';
import { markRead, advanceRevision, toggleBookmark } from '@/lib/store';
import { CATEGORY_MAP, EXAM_MAP } from '@/lib/taxonomy';
import { t, UI } from '@/lib/i18n';
import type { Article } from '@/lib/types';

function Block({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'brand' }) {
  return (
    <section className="mb-6">
      <h2 className={`label mb-2 ${tone === 'brand' ? 'text-brand' : ''}`}>{title}</h2>
      {children}
    </section>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, T, update, state } = useApp();
  const [a, setA] = useState<Article | null | 'missing'>(null);

  useEffect(() => {
    let alive = true;
    getArticleById(id).then((r) => { if (alive) setA(r ?? 'missing'); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => { if (a && a !== 'missing') update((s) => markRead(s, a.id)); }, [a, update]);

  if (a === null) return <Spinner label={T('loading')} />;
  if (a === 'missing') {
    return (
      <div className="max-w-2xl">
        <Empty>{lang === 'hi' ? 'यह समाचार नहीं मिला। शायद यह पुराने संग्रह से हटा दिया गया है।' : 'Article not found. It may have rolled out of the archive.'}</Empty>
        <button onClick={() => router.push('/news')} className="btn mt-3">{T('back')}</button>
      </div>
    );
  }

  const bookmarked = state.bookmarks.includes(a.id);
  const hasHi = (v: { en: string; hi: string }) => Boolean(lang === 'hi' ? v.hi : v.en);

  return (
    <article className="max-w-2xl rise">
      <button onClick={() => router.back()} className="text-[13px] text-faint hover:text-ink mb-3 no-print">← {T('back')}</button>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Stars score={a.relevance.score} size={15} />
        <PriorityChip priority={a.relevance.priority} lang={lang} />
        {a.categories.map((c) => (
          <Link key={c} href={`/news?cat=${c}`} className="chip hover:border-brand hover:text-brand">
            {t(CATEGORY_MAP[c]?.label as any, lang) || c}
          </Link>
        ))}
        {a.state && <Link href="/state" className="chip border-brand/30 text-brand">{a.state.replace(/-/g, ' ')}</Link>}
      </div>

      <h1 className={`text-[24px] sm:text-[27px] font-semibold leading-[1.25] tracking-tight ${lang === 'hi' ? 'hi' : ''}`}>
        {t(a.title, lang)}
      </h1>

      {/* Provenance sits directly under the headline, before any analysis. */}
      <div className="mt-3 mb-6 card p-3 bg-paper">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <VerificationBadge status={a.source.verification} lang={lang} />
          <span className="text-muted font-medium">{a.source.name}</span>
          {a.source.ministry && <span className="text-faint">· {a.source.ministry}</span>}
          {a.source.publishedAt && (
            <span className="text-faint tabular-nums">
              · {new Date(a.source.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          <a href={a.source.url} target="_blank" rel="noopener noreferrer" className="link">{T('readFull')} ↗</a>
          {(a.source.corroboration || []).slice(0, 3).map((c, i) => (
            <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="text-faint hover:text-brand underline underline-offset-2">
              {c.name}
            </a>
          ))}
        </div>
        {a.source.verification === 'unverified' && (
          <p className="mt-2 text-[12px] text-warm leading-snug">⚠ {T('unverifiedNote')}</p>
        )}
      </div>

      {a.degraded && (
        <div className="card p-3 mb-6 border-warm/40 bg-warm/[0.05] text-[13px] text-warm">
          {lang === 'hi'
            ? 'इस समाचार का स्वतः विश्लेषण उपलब्ध नहीं हो सका। केवल सत्यापित शीर्षक दिखाया जा रहा है।'
            : 'Automated analysis was unavailable for this item. Only the verified headline is shown.'}
        </div>
      )}

      {hasHi(a.summary) && (
        <Block title={T('whatHappened')}>
          <p className={`prose-read ${lang === 'hi' ? 'hi' : ''}`}>{t(a.summary, lang)}</p>
        </Block>
      )}

      {hasHi(a.whyImportant) && (
        <Block title={T('whyImportant')}>
          <p className={`prose-read ${lang === 'hi' ? 'hi' : ''}`}>{t(a.whyImportant, lang)}</p>
        </Block>
      )}

      {hasHi(a.examAngle) && (
        <Block title={T('examAngle')} tone="brand">
          <div className="card p-3.5 bg-brandsoft/50 border-brand/25">
            <p className={`text-[15px] leading-relaxed ${lang === 'hi' ? 'hi' : ''}`}>{t(a.examAngle, lang)}</p>
            {a.relevance.rationale.en && (
              <p className={`mt-2 text-[12.5px] text-muted ${lang === 'hi' ? 'hi' : ''}`}>{t(a.relevance.rationale, lang)}</p>
            )}
          </div>
        </Block>
      )}

      {hasHi(a.background) && (
        <Block title={T('background')}>
          <p className={`prose-read ${lang === 'hi' ? 'hi' : ''}`}>{t(a.background, lang)}</p>
        </Block>
      )}

      {a.staticFacts.length > 0 && (
        <Block title={T('staticGk')}>
          <ul className="space-y-2">
            {a.staticFacts.map((f, i) => (
              <li key={i} className="flex gap-2.5 card p-3">
                <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-warm" />
                <div className="min-w-0">
                  {f.kind && <div className="label mb-0.5">{f.kind}</div>}
                  <p className={`text-[14px] leading-relaxed ${lang === 'hi' ? 'hi' : ''}`}>{t(f.point, lang)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {a.organisations.length > 0 && (
        <Block title={T('organisations')}>
          <div className="space-y-1.5">
            {a.organisations.map((o, i) => (
              <div key={i} className="card p-3">
                <div className="text-[14px] font-semibold">{o.name}</div>
                <p className={`text-[13px] text-muted mt-0.5 leading-relaxed ${lang === 'hi' ? 'hi' : ''}`}>{t(o.note, lang)}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {a.terminology.length > 0 && (
        <Block title={T('terminology')}>
          <dl className="card divide-y divide-line">
            {a.terminology.map((tm, i) => (
              <div key={i} className="p-3">
                <dt className="text-[14px] font-semibold">{tm.term}</dt>
                <dd className={`text-[13px] text-muted mt-0.5 leading-relaxed ${lang === 'hi' ? 'hi' : ''}`}>{t(tm.meaning, lang)}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      {a.syllabus.length > 0 && (
        <Block title={T('syllabusMap')}>
          <div className="card scroll-x">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="p-2.5 label">Exam</th>
                  <th className="p-2.5 label">Paper</th>
                  <th className="p-2.5 label">Topic</th>
                </tr>
              </thead>
              <tbody>
                {a.syllabus.map((sy, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="p-2.5 font-medium whitespace-nowrap">{EXAM_MAP[sy.exam]?.short || sy.exam}</td>
                    <td className="p-2.5 text-muted whitespace-nowrap">{sy.paper}</td>
                    <td className="p-2.5 text-muted">{sy.topic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.exams.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="label mr-1 self-center">{T('relevantExams')}:</span>
              {a.exams.map((e) => <span key={e} className="chip border-brand/30 text-brand">{EXAM_MAP[e]?.short || e}</span>)}
            </div>
          )}
        </Block>
      )}

      {a.pyq && a.pyq.en && (
        <Block title={T('pyqPattern')}>
          <div className="card p-3.5 border-l-2 border-l-warm">
            <p className={`text-[14px] leading-relaxed text-muted ${lang === 'hi' ? 'hi' : ''}`}>{t(a.pyq, lang)}</p>
          </div>
        </Block>
      )}

      {a.mcqs.length > 0 && (
        <Block title={`${T('practice')} (${a.mcqs.length})`}>
          <div className="space-y-3">
            {a.mcqs.map((m, i) => <McqBlock key={m.id} mcq={m} lang={lang} index={i + 1} />)}
          </div>
        </Block>
      )}

      <div className="flex flex-wrap gap-2 mt-8 pt-5 border-t border-line no-print">
        <button
          onClick={() => update((s) => advanceRevision(s, a.id))}
          className="btn btn-primary">
          ✓ {T('markRevised')}
        </button>
        <button onClick={() => update((s) => toggleBookmark(s, a.id))} className="btn">
          {bookmarked ? `★ ${T('bookmarked')}` : `☆ ${T('bookmark')}`}
        </button>
        <Link href="/news" className="btn">{T('news')}</Link>
      </div>

      {a.source.aiProcessed && (
        <p className="mt-5 text-[11.5px] text-faint leading-relaxed border-t border-line pt-4">
          {t(UI.aiNote, lang)}
        </p>
      )}
    </article>
  );
}
