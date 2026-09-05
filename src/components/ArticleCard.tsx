'use client';

import Link from 'next/link';
import type { Article, IndexRecord, Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { CATEGORY_MAP } from '@/lib/taxonomy';
import { Stars, VerificationBadge } from './ui';

type Item = Article | IndexRecord;

const score = (a: Item) => ('relevance' in a ? a.relevance.score : a.score);
const verification = (a: Item) => ('source' in a ? a.source.verification : a.verification);
const sourceName = (a: Item) => ('source' in a ? a.source.name : a.sourceName);
const mcqCount = (a: Item) => ('mcqs' in a ? a.mcqs.length : a.mcqCount);

export function ArticleCard({
  a, lang, compact = false, rank,
}: { a: Item; lang: Lang; compact?: boolean; rank?: number }) {
  const cats = a.categories.slice(0, compact ? 2 : 3);
  return (
    <Link
      href={`/news/${a.id}`}
      className="card p-4 block hover:border-brand/50 transition-colors group">
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span className="shrink-0 mt-0.5 w-6 h-6 grid place-items-center rounded bg-brandsoft text-brand text-[11px] font-bold tabular-nums">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Stars score={score(a)} />
            {cats.map((c) => (
              <span key={c} className="chip">{t(CATEGORY_MAP[c]?.label as any, lang) || c}</span>
            ))}
            {a.state && <span className="chip border-brand/30 text-brand">{a.state.replace(/-/g, ' ')}</span>}
          </div>

          <h3 className={`font-semibold group-hover:text-brand transition-colors ${compact ? 'text-[14.5px] leading-snug' : 'text-[16px] leading-[1.4]'} ${lang === 'hi' ? 'hi' : ''}`}>
            {t(a.title, lang)}
          </h3>

          {!compact && t(a.summary, lang) && (
            <p className={`mt-1.5 text-[13.5px] leading-relaxed text-muted line-clamp-2 ${lang === 'hi' ? 'hi' : ''}`}>
              {t(a.summary, lang)}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-faint">
            <VerificationBadge status={verification(a)} lang={lang} compact />
            <span className="truncate max-w-[190px]">{sourceName(a)}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{a.date}</span>
            {mcqCount(a) > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="text-brand font-medium">{mcqCount(a)} Q</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ArticleRow({ a, lang, n }: { a: Item; lang: Lang; n: number }) {
  return (
    <Link href={`/news/${a.id}`} className="flex items-start gap-3 py-2.5 border-b border-line last:border-0 group">
      <span className="shrink-0 w-5 text-right text-[11px] font-semibold text-faint tabular-nums mt-0.5">{n}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] leading-snug font-medium group-hover:text-brand transition-colors ${lang === 'hi' ? 'hi' : ''}`}>
          {t(a.title, lang)}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-faint">
          <Stars score={score(a)} size={10} />
          <span className="truncate">{sourceName(a)}</span>
        </div>
      </div>
    </Link>
  );
}
