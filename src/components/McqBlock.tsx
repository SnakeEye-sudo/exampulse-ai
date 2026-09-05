'use client';

import { useState } from 'react';
import type { Mcq, Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { useApp } from './AppProvider';
import { recordAttempt } from '@/lib/store';

const TYPE_LABEL: Record<string, { en: string; hi: string }> = {
  statement: { en: 'Statement based', hi: 'कथन आधारित' },
  'multiple-correct': { en: 'Multiple correct', hi: 'बहु-सही' },
  match: { en: 'Match the following', hi: 'सुमेलित कीजिए' },
  'assertion-reason': { en: 'Assertion–Reason', hi: 'कथन–कारण' },
  chronology: { en: 'Chronology', hi: 'कालक्रम' },
  'static-link': { en: 'Current + Static', hi: 'करेंट + स्थायी' },
  direct: { en: 'Direct', hi: 'प्रत्यक्ष' },
};

/**
 * One self-contained question. Answering it writes an attempt to local state,
 * which is what feeds the mistake book, the weakness analysis and the SRS
 * demotion — so practice anywhere in the app counts everywhere in the app.
 */
export function McqBlock({ mcq, lang, index }: { mcq: Mcq; lang: Lang; index?: number }) {
  const { update, T } = useApp();
  const [chosen, setChosen] = useState<number | null>(null);
  const [start] = useState(() => Date.now());

  const answered = chosen !== null;
  const correct = chosen === mcq.answer;
  const options = (lang === 'hi' && mcq.options.hi?.length === 4 ? mcq.options.hi : mcq.options.en);

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    update((s) =>
      recordAttempt(s, {
        mcqId: mcq.id, articleId: mcq.articleId,
        correct: i === mcq.answer, chosen: i, answer: mcq.answer,
        seconds: Math.round((Date.now() - start) / 1000),
        categories: mcq.categories,
      })
    );
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {index !== undefined && <span className="chip !text-brand !border-brand/40">Q{index}</span>}
        <span className="chip">{t(TYPE_LABEL[mcq.type] || TYPE_LABEL.direct, lang)}</span>
        <span className="chip">{mcq.difficulty}</span>
      </div>

      <p className={`text-[15px] font-medium leading-relaxed whitespace-pre-line mb-3 ${lang === 'hi' ? 'hi' : ''}`}>
        {t(mcq.question, lang)}
      </p>

      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const isAnswer = i === mcq.answer;
          const isChosen = i === chosen;
          let cls = 'border-line hover:border-brand/50';
          if (answered) {
            if (isAnswer) cls = 'border-good bg-good/[0.08] text-good';
            else if (isChosen) cls = 'border-hot bg-hot/[0.08] text-hot';
            else cls = 'border-line opacity-55';
          }
          return (
            <button key={i} onClick={() => choose(i)} disabled={answered}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-[14px] leading-snug transition-colors flex gap-2.5 ${cls} ${answered ? 'cursor-default' : ''}`}>
              <span className="shrink-0 font-semibold w-4">{String.fromCharCode(97 + i)}.</span>
              <span className={lang === 'hi' ? 'hi' : ''}>{opt}</span>
              {answered && isAnswer && <span className="ml-auto shrink-0">✓</span>}
              {answered && isChosen && !isAnswer && <span className="ml-auto shrink-0">✕</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-3 rise">
          <p className={`text-[13px] font-semibold mb-1.5 ${correct ? 'text-good' : 'text-hot'}`}>
            {correct ? `✓ ${T('correct')}` : `✕ ${T('incorrect')}`}
          </p>
          <div className="rounded-lg bg-brandsoft/60 border border-line p-3">
            <div className="label mb-1">{T('explanation')}</div>
            <p className={`text-[13.5px] leading-relaxed text-muted ${lang === 'hi' ? 'hi' : ''}`}>
              {t(mcq.explanation, lang)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
