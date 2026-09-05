'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { EXAMS, STATES } from '@/lib/taxonomy';
import { exportState, importState } from '@/lib/store';
import { t, UI } from '@/lib/i18n';
import type { ExamId } from '@/lib/types';

export default function SettingsPage() {
  const { state, update, replace, reset, lang, setLang, T, theme, setTheme, manifest } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const p = state.profile;

  const setProfile = (patch: Partial<typeof p>) =>
    update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const doExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exampulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    const parsed = importState(text);
    if (!parsed) { setMsg({ kind: 'err', text: lang === 'hi' ? 'फ़ाइल पढ़ी नहीं जा सकी।' : 'That file could not be read as an ExamPulse backup.' }); return; }
    replace(parsed);
    setMsg({ kind: 'ok', text: lang === 'hi' ? 'डेटा आयात हो गया।' : 'Data imported.' });
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="py-3.5 border-b border-line last:border-0">
      <label className="label block mb-1.5">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="max-w-xl rise">
      <h1 className="text-2xl font-semibold tracking-tight mb-5">{T('settings')}</h1>

      {msg && (
        <div className={`card p-3 mb-4 text-[13px] ${msg.kind === 'ok' ? 'border-good/40 text-good' : 'border-hot/40 text-hot'}`}>
          {msg.text}
        </div>
      )}

      <div className="card px-4 mb-5">
        <Row label={T('yourName')}>
          <input value={p.name} onChange={(e) => setProfile({ name: e.target.value })}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
        </Row>

        <Row label={T('choosePrimary')}>
          <select value={p.primaryExam} onChange={(e) => setProfile({ primaryExam: e.target.value as ExamId })}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
            {EXAMS.map((e) => <option key={e.id} value={e.id}>{t(e.label, lang)}</option>)}
          </select>
          <p className="text-[12px] text-faint mt-1.5">{t(EXAMS.find((e) => e.id === p.primaryExam)!.blurb, lang)}</p>
        </Row>

        <Row label={T('chooseExams')}>
          <div className="flex flex-wrap gap-1.5">
            {EXAMS.map((e) => {
              const on = p.exams.includes(e.id);
              return (
                <button key={e.id}
                  onClick={() => setProfile({ exams: on ? (p.exams.length > 1 ? p.exams.filter((x) => x !== e.id) : p.exams) : [...p.exams, e.id] })}
                  className={`chip !normal-case ${on ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
                  {e.short}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label={T('chooseState')}>
          <select value={p.state || ''} onChange={(e) => setProfile({ state: e.target.value || null })}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
            <option value="">{lang === 'hi' ? '— कोई नहीं —' : '— none —'}</option>
            {STATES.map((s) => <option key={s.slug} value={s.slug}>{lang === 'hi' ? s.hi : s.en}</option>)}
          </select>
        </Row>

        <Row label={T('examDateQ')}>
          <input type="date" value={p.examDate || ''} onChange={(e) => setProfile({ examDate: e.target.value || null })}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
        </Row>

        <Row label={T('language')}>
          <div className="flex gap-2">
            {(['en', 'hi'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`btn flex-1 justify-center !py-2 text-sm ${lang === l ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
                {l === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
        </Row>

        <Row label={T('theme')}>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((th) => (
              <button key={th} onClick={() => setTheme(th)}
                className={`btn flex-1 justify-center !py-2 text-sm ${theme === th ? '!border-brand !text-brand bg-brandsoft' : ''}`}>
                {T(th)}
              </button>
            ))}
          </div>
        </Row>

        <Row label={T('focusMode')}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={p.focusMode} onChange={(e) => setProfile({ focusMode: e.target.checked })}
              className="mt-1 accent-[rgb(var(--brand))]" />
            <span className="text-[13px] text-muted leading-relaxed">{T('focusModeNote')}</span>
          </label>
        </Row>
      </div>

      <h2 className="label mb-2">{lang === 'hi' ? 'आपका डेटा' : 'Your data'}</h2>
      <div className="card p-4 mb-5">
        <p className="text-[13px] text-muted leading-relaxed mb-3">{t(UI.dataNote, lang)}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={doExport} className="btn text-[13px]">↓ {T('exportData')}</button>
          <button onClick={() => fileRef.current?.click()} className="btn text-[13px]">↑ {T('importData')}</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
        </div>
        <div className="mt-3 pt-3 border-t border-line text-[12px] text-faint space-y-0.5 tabular-nums">
          <div>{state.attempts.length} attempts · {state.quizzes.length} quizzes · {state.revision.length} revision cards · {state.bookmarks.length} bookmarks</div>
          {manifest && <div>Archive: {manifest.totalArticles} articles, {manifest.totalMcqs} questions, {manifest.dates.length} days · updated {manifest.generatedAt.slice(0, 16).replace('T', ' ')} UTC</div>}
        </div>
      </div>

      <div className="card p-4 border-hot/30">
        <p className="text-[13px] text-muted mb-3">
          {lang === 'hi'
            ? 'रीसेट करने पर आपकी प्रोफ़ाइल, प्रगति, गलती पुस्तिका और रिवीज़न शेड्यूल स्थायी रूप से मिट जाएँगे। पहले निर्यात कर लें।'
            : 'Reset permanently erases your profile, progress, mistake book and revision schedule. Export first.'}
        </p>
        <button
          onClick={() => {
            if (confirm(lang === 'hi' ? 'सब कुछ मिटाएँ? यह वापस नहीं आएगा।' : 'Erase everything? This cannot be undone.')) {
              reset();
              router.replace('/onboarding');
            }
          }}
          className="btn !border-hot !text-hot text-[13px]">
          {T('resetData')}
        </button>
      </div>

      <p className="text-[11.5px] text-faint mt-6 leading-relaxed">
        ExamPulse AI · {lang === 'hi' ? 'समाचार स्रोतों से रोज़ स्वतः संकलित।' : 'Compiled automatically from public news sources every day.'}
        {' '}{t(UI.aiNote, lang)}
      </p>
    </div>
  );
}
