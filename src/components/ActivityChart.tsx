'use client';

import type { Lang } from '@/lib/types';

interface Day { date: string; attempts: number; correct: number }

/**
 * Seven-day activity, drawn with pixel heights rather than percentages.
 *
 * Percentage heights need an ancestor with a resolved height; inside a flex
 * column that ancestor is auto-sized, so the bars silently collapse to zero and
 * you get a chart of nothing but date labels. Computing pixels from the row
 * height sidesteps the whole class of bug.
 */
export function ActivityChart({
  week, height = 96, lang, showLegend = true, tone = 'split',
}: { week: Day[]; height?: number; lang: Lang; showLegend?: boolean; tone?: 'split' | 'solid' }) {
  const max = Math.max(1, ...week.map((d) => d.attempts));
  const trackHeight = height;

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: trackHeight + 30 }}>
        {week.map((d) => {
          const total = Math.round((d.attempts / max) * trackHeight);
          const right = Math.round((d.correct / max) * trackHeight);
          const wrong = Math.max(0, total - right);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1"
              title={`${d.date}: ${d.correct}/${d.attempts}`}>
              <span className="text-[10px] text-faint tabular-nums leading-none h-3">
                {d.attempts || ''}
              </span>
              <div className="w-full flex flex-col justify-end" style={{ height: trackHeight }}>
                {tone === 'split' ? (
                  <>
                    {wrong > 0 && <div className="w-full rounded-t-sm bg-hot/55" style={{ height: wrong }} />}
                    {right > 0 && (
                      <div className={`w-full bg-good/75 ${wrong > 0 ? 'rounded-b-sm' : 'rounded-sm'}`} style={{ height: right }} />
                    )}
                    {total === 0 && <div className="w-full rounded-sm bg-line/70" style={{ height: 2 }} />}
                  </>
                ) : (
                  <div className="w-full rounded-sm bg-brand/70" style={{ height: Math.max(total, 2) }} />
                )}
              </div>
              <span className="text-[10px] text-faint leading-none">{d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="flex gap-4 mt-3 text-[11px] text-faint">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-good/75" />{lang === 'hi' ? 'सही' : 'Correct'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-hot/55" />{lang === 'hi' ? 'गलत' : 'Incorrect'}</span>
        </div>
      )}
    </div>
  );
}
