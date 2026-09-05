'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { ArticleCard } from '@/components/ArticleCard';
import { Empty, Spinner } from '@/components/ui';
import { rankForUser } from '@/lib/data';
import { STATES, STATE_MAP, CATEGORY_MAP } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';

export default function StatePage() {
  const { index, dataReady, lang, T, state, update } = useApp();
  const slug = state.profile.state;

  const items = useMemo(() => {
    if (!slug) return [];
    return rankForUser(index.filter((r) => r.state === slug), state.profile);
  }, [index, slug, state.profile]);

  const byCategory = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const it of items) {
      for (const c of it.categories) {
        if (c === 'state') continue;
        m.set(c, [...(m.get(c) || []), it]);
      }
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  const available = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of index) if (r.state) m.set(r.state, (m.get(r.state) || 0) + 1);
    return m;
  }, [index]);

  if (!dataReady) return <Spinner label={T('loading')} />;

  const stateName = slug ? (lang === 'hi' ? STATE_MAP[slug]?.hi : STATE_MAP[slug]?.en) || slug : null;

  return (
    <div className="max-w-2xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{T('stateAffairs')}</h1>

      <div className="flex items-center gap-2 mb-5">
        <select
          value={slug || ''}
          onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, state: e.target.value || null } }))}
          className="rounded-md border border-line bg-raised px-3 py-2 text-[14px]">
          <option value="">{lang === 'hi' ? '— राज्य चुनें —' : '— choose a state —'}</option>
          {STATES.map((st) => (
            <option key={st.slug} value={st.slug}>
              {(lang === 'hi' ? st.hi : st.en)}{available.get(st.slug) ? ` (${available.get(st.slug)})` : ''}
            </option>
          ))}
        </select>
      </div>

      {!slug ? (
        <Empty>
          {lang === 'hi'
            ? 'राज्य चुनें — फिर उस राज्य के सरकारी निर्णय, योजनाएँ, बजट, नियुक्तियाँ, अवसंरचना, कृषि और ज़िला-स्तरीय घटनाक्रम यहाँ प्राथमिकता से दिखेंगे।'
            : 'Pick a state, and its government decisions, schemes, budget, appointments, infrastructure, agriculture and district-level developments get ranked first.'}
        </Empty>
      ) : items.length === 0 ? (
        <Empty>
          {lang === 'hi'
            ? `${stateName} के लिए अभी कोई समाचार संग्रहित नहीं। पाइपलाइन रोज़ चलती है — कल दोबारा देखें।`
            : `Nothing archived for ${stateName} yet. The pipeline runs daily — check back tomorrow.`}
        </Empty>
      ) : (
        <>
          <p className="text-[13px] text-faint mb-4">
            {items.length} {T('articles')} · {stateName}
          </p>

          <div className="space-y-2.5 mb-8">
            {items.slice(0, 20).map((a) => <ArticleCard key={a.id} a={a} lang={lang} />)}
          </div>

          {byCategory.length > 0 && (
            <div>
              <h2 className="label mb-2.5">{lang === 'hi' ? 'विषयवार' : 'By theme'}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {byCategory.map(([c, list]) => (
                  <Link key={c} href={`/news?cat=${c}`} className="card p-3 hover:border-brand/50">
                    <div className="text-lg font-semibold tabular-nums">{list.length}</div>
                    <div className="text-[12px] text-muted mt-0.5">{t((CATEGORY_MAP as any)[c]?.label, lang) || c}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
