'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Spinner } from '@/components/ui';
import { searchIndex, getArticlesByIds } from '@/lib/data';
import { UI, t } from '@/lib/i18n';

interface Answer {
  topic: string;
  currentFacts: string[];
  background: string[];
  examFacts: string[];
  possibleQuestions: string[];
  confidence: 'high' | 'medium' | 'low';
  caveat?: string;
  grounded?: boolean;
}

const SUGGEST_EN = ['Repo rate and monetary policy', 'Article 370 — full timeline', 'PM-KISAN scheme details', 'What is the Ramsar Convention?', 'Fiscal deficit vs revenue deficit'];
const SUGGEST_HI = ['रेपो रेट और मौद्रिक नीति', 'अनुच्छेद 370 — पूरा घटनाक्रम', 'पीएम-किसान योजना', 'रामसर कन्वेंशन क्या है?', 'राजकोषीय बनाम राजस्व घाटा'];

function AskInner() {
  const { lang, T, state, index } = useApp();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const p = params.get('q'); if (p) { setQ(p); void submit(p); } /* eslint-disable-next-line */ }, [params]);

  async function submit(question: string) {
    const text = question.trim();
    if (text.length < 3 || loading) return;
    setLoading(true); setError(null); setAnswer(null);

    // Ground the answer in what the app actually holds, so current claims come
    // with a source rather than from the model's memory.
    const matches = searchIndex(index, text).slice(0, 5);
    const arts = await getArticlesByIds(matches.map((m) => m.id));
    const context = arts.map((a) => ({
      title: a.title.en, summary: a.summary.en || a.title.en,
      source: a.source.name, date: a.date,
    }));

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, lang, exam: state.profile.primaryExam, context }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong.'); return; }
      setAnswer(data);
    } catch {
      setError(lang === 'hi' ? 'नेटवर्क त्रुटि। दोबारा कोशिश करें।' : 'Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const Group = ({ title, items, tone }: { title: string; items: string[]; tone?: string }) =>
    items?.length ? (
      <div className="mb-5">
        <div className={`label mb-1.5 ${tone || ''}`}>{title}</div>
        <ul className="space-y-1.5">
          {items.map((x, i) => (
            <li key={i} className={`text-[14px] leading-relaxed flex gap-2 ${lang === 'hi' ? 'hi' : ''}`}>
              <span className="text-faint shrink-0 mt-[3px]">•</span>{x}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('ask')}</h1>
      <p className="text-[13px] text-faint mb-4">{t(UI.askIntro, lang)}</p>

      <form onSubmit={(e) => { e.preventDefault(); void submit(q); }} className="flex gap-2 mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('askPlaceholder')}
          className="flex-1 rounded-lg border border-line bg-raised px-3.5 py-2.5 text-[14.5px] focus:border-brand outline-none" />
        <button type="submit" disabled={loading || q.trim().length < 3} className="btn btn-primary shrink-0">
          {loading ? '…' : (lang === 'hi' ? 'पूछें' : 'Ask')}
        </button>
      </form>

      {!answer && !loading && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {(lang === 'hi' ? SUGGEST_HI : SUGGEST_EN).map((s) => (
            <button key={s} onClick={() => { setQ(s); void submit(s); }} className="chip !normal-case hover:border-brand hover:text-brand">
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && <Spinner label={lang === 'hi' ? 'उत्तर तैयार हो रहा है…' : 'Composing an exam-oriented answer…'} />}

      {error && (
        <div className="card p-4 border-hot/40 bg-hot/[0.05] text-[13.5px] text-hot leading-relaxed">
          {error}
        </div>
      )}

      {answer && (
        <article className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-line">
            <h2 className="text-[17px] font-semibold flex-1 min-w-0">{answer.topic}</h2>
            <span className={`chip ${answer.confidence === 'high' ? 'border-good/40 text-good' : answer.confidence === 'medium' ? 'border-warm/40 text-warm' : 'border-hot/40 text-hot'}`}>
              {answer.confidence} confidence
            </span>
            {answer.grounded && (
              <span className="chip border-brand/40 text-brand">
                {lang === 'hi' ? 'ऐप के स्रोतों पर आधारित' : 'grounded in app sources'}
              </span>
            )}
          </div>

          {answer.caveat && (
            <p className="mb-4 text-[13px] text-warm leading-relaxed border-l-2 border-warm pl-3">⚠ {answer.caveat}</p>
          )}

          <Group title={T('currentFacts')} items={answer.currentFacts} tone="text-brand" />
          <Group title={T('backgroundInfo')} items={answer.background} />
          <Group title={T('examFacts')} items={answer.examFacts} tone="text-warm" />

          {answer.possibleQuestions?.length > 0 && (
            <div className="mb-2">
              <div className="label mb-1.5">{T('possibleQuestions')}</div>
              <ol className="space-y-2">
                {answer.possibleQuestions.map((x, i) => (
                  <li key={i} className={`text-[14px] leading-relaxed flex gap-2.5 ${lang === 'hi' ? 'hi' : ''}`}>
                    <span className="shrink-0 w-5 h-5 grid place-items-center rounded-full bg-brandsoft text-brand text-[10px] font-bold mt-0.5">{i + 1}</span>
                    {x}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="mt-5 pt-3 border-t border-line text-[11.5px] text-faint leading-relaxed">
            {T('askDisclaimer')}
            {!answer.grounded && (lang === 'hi'
              ? ' इस विषय पर ऐप के संग्रह में कोई समाचार नहीं मिला, इसलिए "वर्तमान तथ्य" की पुष्टि नहीं की जा सकी।'
              : ' No article on this topic was found in the app archive, so "current facts" could not be grounded in a source.')}
          </p>

          <Link href={`/search?q=${encodeURIComponent(answer.topic)}`} className="link text-[13px] mt-3 inline-block">
            {lang === 'hi' ? 'संबंधित समाचार देखें' : 'See matching articles'} →
          </Link>
        </article>
      )}
    </div>
  );
}

export default function AskPage() {
  return <Suspense fallback={<Spinner />}><AskInner /></Suspense>;
}
