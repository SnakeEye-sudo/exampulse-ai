'use client';

import React from 'react';
import Link from 'next/link';
import type { VerificationStatus, Priority, Lang, Bi } from '@/lib/types';
import { t } from '@/lib/i18n';

/** Five-star exam relevance. Filled stars are the signal; the number is the label. */
export function Stars({ score, size = 13 }: { score: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[1px] align-middle" aria-label={`Exam relevance ${score} of 5`} title={`Exam relevance: ${score}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"
          className={i <= score ? 'text-warm' : 'text-line'}>
          <path fill="currentColor" d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'border-hot/40 text-hot bg-hot/[0.07]',
  medium: 'border-warm/40 text-warm bg-warm/[0.07]',
  low: 'border-line text-faint',
};

export function PriorityChip({ priority, lang }: { priority: Priority; lang: Lang }) {
  const label: Record<Priority, Bi> = {
    high: { en: 'High priority', hi: 'उच्च प्राथमिकता' },
    medium: { en: 'Medium', hi: 'मध्यम' },
    low: { en: 'Low', hi: 'निम्न' },
  };
  return <span className={`chip ${PRIORITY_STYLES[priority]}`}>{t(label[priority], lang)}</span>;
}

/**
 * Provenance is displayed on every single item, not tucked into a footer.
 * A student who cannot see where a "fact" came from cannot judge whether to
 * write it in an answer booklet.
 */
export function VerificationBadge({ status, lang, compact = false }: { status: VerificationStatus; lang: Lang; compact?: boolean }) {
  const map: Record<VerificationStatus, { label: Bi; cls: string; icon: string }> = {
    primary: { label: { en: 'Primary source', hi: 'प्राथमिक स्रोत' }, cls: 'border-good/40 text-good bg-good/[0.07]', icon: 'M5 10.5l3.2 3.2L15 7' },
    verified: { label: { en: 'Verified', hi: 'सत्यापित' }, cls: 'border-brand/40 text-brand bg-brand/[0.06]', icon: 'M5 10.5l3.2 3.2L15 7' },
    unverified: { label: { en: 'Unverified', hi: 'असत्यापित' }, cls: 'border-warm/50 text-warm bg-warm/[0.07]', icon: 'M10 6v5m0 3h.01' },
  };
  const v = map[status];
  return (
    <span className={`chip ${v.cls}`}>
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d={v.icon} />
      </svg>
      {!compact && t(v.label, lang)}
    </span>
  );
}

export function Section({
  title, action, children, className = '', id,
}: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mb-8 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.09em] text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-6 text-center text-sm text-faint">{children}</div>;
}

export function Stat({ value, label, tone = 'ink', href }: { value: React.ReactNode; label: string; tone?: 'ink' | 'good' | 'hot' | 'brand'; href?: string }) {
  const tones = { ink: 'text-ink', good: 'text-good', hot: 'text-hot', brand: 'text-brand' };
  const inner = (
    <>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${tones[tone]}`}>{value}</div>
      <div className="label mt-1.5">{label}</div>
    </>
  );
  return href
    ? <Link href={href} className="card p-3.5 block hover:border-brand/50 transition-colors">{inner}</Link>
    : <div className="card p-3.5">{inner}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-faint">
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'good' | 'hot' | 'warm' }) {
  const bg = { brand: 'bg-brand', good: 'bg-good', hot: 'bg-hot', warm: 'bg-warm' }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-line/70 overflow-hidden">
      <div className={`h-full rounded-full ${bg} transition-[width] duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
