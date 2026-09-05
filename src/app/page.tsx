'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { ArticleCard, ArticleRow } from '@/components/ArticleCard';
import { Section, Stat, Empty, Spinner, ProgressBar, Stars } from '@/components/ui';
import { getRecentArticles, rankForUser, applyFocusMode, getArticlesByIds } from '@/lib/data';
import { dueToday, weakCategories, openMistakes, daysToExam, overallAccuracy, last7DaysActivity, todayIso } from '@/lib/store';
import { buildAdvice, greeting } from '@/lib/advice';
import { CATEGORY_MAP, EXAM_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { Article } from '@/lib/types';

export default function Dashboard() {
  const { state, T, lang, hydrated, dataReady } = useApp();
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [dueArticles, setDueArticles] = useState<Article[]>([]);

  useEffect(() => { getRecentArticles(10).then(setArticles); }, []);

  const due = useMemo(() => dueToday(state), [state]);
  useEffect(() => {
    if (!due.length) { setDueArticles([]); return; }
    getArticlesByIds(due.slice(0, 6).map((d) => d.articleId)).then(setDueArticles);
  }, [due]);

  const today = todayIso();
  const profile = state.profile;

  const todays = useMemo(() => (articles || []).filter((a) => a.date === today), [articles, today]);
  const pool = useMemo(() => {
    const base = todays.length >= 5 ? todays : (articles || []).slice(0, 60);
    return applyFocusMode(rankForUser(base, profile), profile.focusMode);
  }, [articles, todays, profile]);

  const readIds = useMemo(() => new Set(state.reads.map((r) => r.articleId)), [state.reads]);
  const missed = useMemo(
    () => applyFocusMode(rankForUser(articles || [], profile), false)
      .filter((a) => a.date < today && a.relevance.score >= 4 && !readIds.has(a.id))
      .slice(0, 6),
    [articles, profile, readIds, today]
  );

  const advice = useMemo(() => buildAdvice(state, todays), [state, todays]);
  const weak = useMemo(() => weakCategories(state), [state]);
  const mistakes = useMemo(() => openMistakes(state), [state]);
  const acc = overallAccuracy(state);
  const dte = daysToExam(profile);
  const week = useMemo(() => last7DaysActivity(state), [state]);
  const examDef = EXAM_MAP[profile.primaryExam];

  if (!hydrated || articles === null) return <Spinner label={T('loading')} />;

  return (
    <div className="rise">
      <div className="mb-6">
        <p className="text-sm text-muted">
          {greeting(lang)}{profile.name ? `, ${profile.name}` : ''}.
        </p>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight mt-0.5">
          {T('todayIntel')}
        </h1>
        <p className="text-[13px] text-faint mt-1">
          {today} · {examDef ? t(examDef.label, lang) : ''} {profile.state ? `· ${profile.state.replace(/-/g, ' ')}` : ''}
          {profile.focusMode && <span className="ml-2 chip border-brand/40 text-brand">{T('focusMode')}</span>}
        </p>
      </div>

      {/* ---- What should I study today? --------------------------------- */}
      <div className="card p-4 sm:p-5 mb-7 border-brand/30 bg-brandsoft/40">
        <div className="label text-brand mb-2">{T('whatToStudy')}</div>
        <p className={`text-[16.5px] font-medium leading-snug mb-3 ${lang === 'hi' ? 'hi' : ''}`}>
          {t(advice.headline, lang)}
        </p>
        <ol className="space-y-2.5">
          {advice.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5 w-5 h-5 grid place-items-center rounded-full bg-brand text-white text-[10px] font-bold">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13.5px] leading-relaxed text-muted ${lang === 'hi' ? 'hi' : ''}`}>{t(s, lang)}</p>
                <Link href={s.href} className="link text-[13px] font-medium inline-block mt-0.5">
                  {t(s.cta, lang)} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ---- Stat strip -------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
        <Stat value={state.streak.current} label={`${T('streak')} (${T('days')})`} tone={state.streak.current > 0 ? 'brand' : 'ink'} />
        <Stat value={due.length} label={T('revisionDue')} tone={due.length ? 'hot' : 'good'} href="/revision" />
        <Stat value={mistakes.length} label={T('mistakes')} tone={mistakes.length ? 'hot' : 'good'} href="/mistakes" />
        <Stat
          value={dte !== null ? (dte >= 0 ? `D−${dte}` : '—') : '—'}
          label={dte !== null && dte >= 0 ? T('daysLeft') : T('setExamDate')}
          tone={dte !== null && dte <= 60 && dte >= 0 ? 'hot' : 'ink'}
          href="/settings"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-x-7">
        <div className="lg:col-span-2">
          <Section
            title={T('topNews')}
            action={<Link href="/news" className="link text-[13px]">{T('viewAll')} →</Link>}>
            {pool.length === 0 ? (
              <Empty>
                {dataReady ? (
                  profile.focusMode
                    ? (lang === 'hi' ? 'गंभीर अभ्यर्थी मोड में आज कोई 4★+ समाचार नहीं। मोड बंद करके देखें।' : 'No 4★+ items today under Serious Aspirant Mode. Turn it off to see the rest.')
                    : T('nothingYet')
                ) : T('loading')}
              </Empty>
            ) : (
              <div className="space-y-2.5">
                {pool.slice(0, 10).map((a, i) => (
                  <ArticleCard key={a.id} a={a} lang={lang} rank={i + 1} />
                ))}
              </div>
            )}
          </Section>

          {missed.length > 0 && (
            <Section title={T('missed')}>
              <div className="card px-4 py-1">
                {missed.map((a, i) => <ArticleRow key={a.id} a={a} lang={lang} n={i + 1} />)}
              </div>
            </Section>
          )}
        </div>

        <div>
          <Section title={T('dailyQuiz')}>
            <div className="card p-4">
              <p className="text-[13px] text-muted mb-3">
                {lang === 'hi'
                  ? 'आज के समाचारों से बने प्रश्न। गलत उत्तर स्वतः गलती पुस्तिका में जाएँगे।'
                  : "Questions built from today's affairs. Wrong answers go straight to your Mistake Book."}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[10, 20, 30].map((n) => (
                  <Link key={n} href={`/quiz?n=${n}`} className="btn justify-center text-sm">{n}</Link>
                ))}
              </div>
              <Link href="/quiz" className="btn btn-primary w-full justify-center mt-2.5">{T('startQuiz')}</Link>
            </div>
          </Section>

          <Section title={T('revisionDue')} action={due.length ? <Link href="/revision" className="link text-[13px]">{T('viewAll')} →</Link> : null}>
            {due.length === 0 ? (
              <Empty>{lang === 'hi' ? 'आज कोई रिवीज़न बकाया नहीं। 👏' : 'Nothing due today. 👏'}</Empty>
            ) : (
              <div className="card px-4 py-1">
                {dueArticles.map((a, i) => <ArticleRow key={a.id} a={a} lang={lang} n={i + 1} />)}
              </div>
            )}
          </Section>

          <Section title={T('weakAreas')}>
            {weak.length === 0 ? (
              <Empty>
                {acc.seen < 8
                  ? (lang === 'hi' ? 'पर्याप्त डेटा नहीं — कुछ क्विज़ दें।' : 'Not enough data yet — attempt a few quizzes.')
                  : (lang === 'hi' ? 'कोई स्पष्ट कमज़ोरी नहीं मिली।' : 'No clear weakness detected.')}
              </Empty>
            ) : (
              <div className="card p-4 space-y-3">
                {weak.slice(0, 5).map((w) => (
                  <div key={w.category}>
                    <div className="flex items-baseline justify-between text-[13px] mb-1">
                      <span className="font-medium">{t(CATEGORY_MAP[w.category]?.label as any, lang) || w.category}</span>
                      <span className="tabular-nums text-faint">{w.right}/{w.seen} · {Math.round(w.accuracy * 100)}%</span>
                    </div>
                    <ProgressBar value={w.accuracy * 100} tone={w.accuracy < 0.5 ? 'hot' : 'warm'} />
                  </div>
                ))}
                <Link href="/quiz?focus=weak" className="btn w-full justify-center mt-1 text-sm">
                  {lang === 'hi' ? 'इन पर क्विज़ दें' : 'Drill these topics'}
                </Link>
              </div>
            )}
          </Section>

          <Section title={T('studyProgress')}>
            <div className="card p-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[13px] text-muted">{T('accuracy')}</span>
                <span className="text-xl font-semibold tabular-nums">{acc.pct}%</span>
              </div>
              <ProgressBar value={acc.pct} tone={acc.pct >= 70 ? 'good' : acc.pct >= 50 ? 'warm' : 'hot'} />
              <p className="text-[11px] text-faint mt-1.5">{acc.right} / {acc.seen} {T('questions')}</p>

              <div className="mt-4 flex items-end gap-1.5 h-14" aria-hidden>
                {week.map((d) => {
                  const max = Math.max(1, ...week.map((x) => x.attempts));
                  const h = (d.attempts / max) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.attempts}`}>
                      <div className="w-full rounded-sm bg-brand/70 transition-[height] duration-500"
                        style={{ height: `${Math.max(d.attempts ? 8 : 2, h)}%` }} />
                      <span className="text-[9px] text-faint">{d.date.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/progress" className="link text-[13px] mt-3 inline-block">{T('viewAll')} →</Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
