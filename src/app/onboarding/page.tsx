'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { EXAMS, STATES } from '@/lib/taxonomy';
import { t } from '@/lib/i18n';
import type { ExamId } from '@/lib/types';

export default function Onboarding() {
  const { state, update, lang, setLang, T } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [exams, setExams] = useState<ExamId[]>(state.profile.onboarded ? state.profile.exams : []);
  const [primary, setPrimary] = useState<ExamId>(state.profile.primaryExam);
  const [customName, setCustomName] = useState('');
  const [stateSlug, setStateSlug] = useState<string | null>(state.profile.state);
  const [examDate, setExamDate] = useState(state.profile.examDate || '');

  const toggleExam = (id: ExamId) => {
    setExams((prev) => {
      const next = prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id];
      if (next.length && !next.includes(primary)) setPrimary(next[0]);
      return next;
    });
  };

  const finish = () => {
    update((s) => ({
      ...s,
      profile: {
        ...s.profile,
        name: name.trim(),
        exams: exams.length ? exams : ['UPSC'],
        primaryExam: exams.includes(primary) ? primary : (exams[0] || 'UPSC'),
        customExamName: customName.trim() || undefined,
        state: stateSlug,
        examDate: examDate || null,
        lang,
        onboarded: true,
      },
    }));
    router.replace('/');
  };

  const stateExam = (['BPSC', 'STATE_PCS', 'POLICE', 'TEACHING'] as ExamId[]).some((e) => exams.includes(e));

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-8">
      <div className="w-full max-w-lg rise">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand text-white text-xs font-bold">EP</span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">ExamPulse<span className="text-brand"> AI</span></h1>
            <p className="text-[12px] text-faint mt-1">{lang === 'hi' ? 'करेंट अफेयर्स, अंकों में बदले।' : 'Current affairs, turned into marks.'}</p>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="btn !px-2.5 !py-1.5 text-xs ml-auto">
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>

        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="card p-5">
            <h2 className="text-[17px] font-semibold mb-1">{T('chooseExams')}</h2>
            <p className="text-[13px] text-muted mb-4">
              {lang === 'hi'
                ? 'यही तय करेगा कि रोज़ कौन-सी खबर आपके लिए ऊपर दिखेगी।'
                : 'This decides which stories are ranked to the top of your feed every morning.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {EXAMS.map((e) => {
                const on = exams.includes(e.id);
                return (
                  <button key={e.id} onClick={() => toggleExam(e.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${on ? 'border-brand bg-brandsoft' : 'border-line hover:border-brand/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border grid place-items-center shrink-0 ${on ? 'bg-brand border-brand' : 'border-line'}`}>
                        {on && <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M4 10.5l3.5 3.5L16 6" /></svg>}
                      </span>
                      <span className="text-[14px] font-medium leading-tight">{t(e.label, lang)}</span>
                    </div>
                    <p className="text-[11.5px] text-faint mt-1.5 leading-snug">{t(e.blurb, lang)}</p>
                  </button>
                );
              })}
            </div>
            {exams.includes('CUSTOM') && (
              <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder={lang === 'hi' ? 'परीक्षा का नाम' : 'Name of your exam'}
                className="mt-3 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
            )}
            <button onClick={() => setStep(1)} disabled={exams.length === 0}
              className="btn btn-primary w-full justify-center mt-4">
              {exams.length === 0
                ? (lang === 'hi' ? 'कम से कम एक परीक्षा चुनें' : 'Pick at least one exam')
                : T('next')}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="card p-5">
            <h2 className="text-[17px] font-semibold mb-1">{T('choosePrimary')}</h2>
            <p className="text-[13px] text-muted mb-4">
              {lang === 'hi' ? 'रैंकिंग मुख्य रूप से इसी परीक्षा के अनुसार होगी।' : 'Ranking is tuned primarily to this one.'}
            </p>
            <div className="space-y-1.5">
              {exams.map((id) => {
                const e = EXAMS.find((x) => x.id === id)!;
                return (
                  <button key={id} onClick={() => setPrimary(id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-[14px] transition-colors ${primary === id ? 'border-brand bg-brandsoft font-medium' : 'border-line hover:border-brand/40'}`}>
                    {t(e.label, lang)}
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label className="label block mb-1.5">{T('chooseState')} {stateExam && <span className="text-hot">*</span>}</label>
              <select value={stateSlug || ''} onChange={(e) => setStateSlug(e.target.value || null)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
                <option value="">{lang === 'hi' ? '— कोई नहीं —' : '— none —'}</option>
                {STATES.map((s) => <option key={s.slug} value={s.slug}>{lang === 'hi' ? s.hi : s.en}</option>)}
              </select>
              {stateExam && !stateSlug && (
                <p className="text-[12px] text-warm mt-1.5">
                  {lang === 'hi'
                    ? 'आपने राज्य-स्तरीय परीक्षा चुनी है — राज्य चुनना ज़रूरी है, वरना राज्य विशेष खबरें रैंक नहीं होंगी।'
                    : 'You picked a state-level exam. Without a state, state-specific news cannot be ranked for you.'}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(0)} className="btn flex-1 justify-center">{T('back')}</button>
              <button onClick={() => setStep(2)} className="btn btn-primary flex-1 justify-center">{T('next')}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card p-5">
            <h2 className="text-[17px] font-semibold mb-4">{lang === 'hi' ? 'लगभग हो गया' : 'Almost done'}</h2>

            <label className="label block mb-1.5">{T('yourName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'hi' ? 'वैकल्पिक' : 'optional'}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm mb-4" />

            <label className="label block mb-1.5">{T('examDateQ')}</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
            <p className="text-[12px] text-faint mt-1.5">
              {lang === 'hi'
                ? 'तिथि देने पर, परीक्षा नज़दीक आते ही ऐप नया पढ़ने के बजाय रिवीज़न पर ज़ोर देगा।'
                : 'Given a date, the app shifts its advice from new reading to revision as the exam approaches.'}
            </p>

            <div className="mt-5 p-3 rounded-lg border border-line bg-paper text-[12px] text-muted leading-relaxed">
              {lang === 'hi'
                ? 'आपकी प्रगति केवल इसी ब्राउज़र में सुरक्षित रहती है — कोई अकाउंट नहीं, कोई सर्वर नहीं। डिवाइस बदलने से पहले सेटिंग्स से डेटा निर्यात कर लें।'
                : 'Your progress is stored only in this browser — no account, no server. Export it from Settings before you switch device.'}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(1)} className="btn flex-1 justify-center">{T('back')}</button>
              <button onClick={finish} className="btn btn-primary flex-1 justify-center">{T('getStarted')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
