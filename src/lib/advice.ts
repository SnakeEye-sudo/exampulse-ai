import type { UserState, Article, Lang, CategoryId } from './types';
import { CATEGORY_MAP, EXAM_MAP } from './taxonomy';
import { dueToday, weakCategories, openMistakes, daysToExam, overallAccuracy, todayIso, istDateOf } from './store';
import { t } from './i18n';

export interface Advice {
  headline: { en: string; hi: string };
  steps: { en: string; hi: string; href: string; cta: { en: string; hi: string } }[];
}

/**
 * The morning recommendation is computed on-device from what the student has
 * actually done — not asked of a model. It is instant, works offline, costs
 * nothing, and is auditable: every sentence traces to a number below.
 */
export function buildAdvice(s: UserState, todaysArticles: Article[]): Advice {
  const due = dueToday(s);
  const weak = weakCategories(s);
  const mistakes = openMistakes(s);
  const dte = daysToExam(s.profile);
  const acc = overallAccuracy(s);
  const exam = EXAM_MAP[s.profile.primaryExam];
  const examName = exam ? exam.short : 'your exam';
  const high = todaysArticles.filter((a) => a.relevance.priority === 'high');
  const readToday = new Set(s.reads.filter((r) => istDateOf(r.at) === todayIso()).map((r) => r.articleId));
  const unreadHigh = high.filter((a) => !readToday.has(a.id));

  const steps: Advice['steps'] = [];

  if (due.length) {
    steps.push({
      en: `${due.length} topic${due.length > 1 ? 's are' : ' is'} due for revision. Forgetting curve says clear these before reading anything new.`,
      hi: `${due.length} विषय रिवीज़न के लिए बकाया हैं। नया पढ़ने से पहले इन्हें पूरा करें — भूलने की प्रवृत्ति यही कहती है।`,
      href: '/revision',
      cta: { en: 'Start revision', hi: 'रिवीज़न शुरू करें' },
    });
  }

  if (unreadHigh.length) {
    steps.push({
      en: `Read the ${Math.min(unreadHigh.length, 10)} high-priority item${unreadHigh.length > 1 ? 's' : ''} flagged for ${examName} today.`,
      hi: `${examName} हेतु आज चिह्नित ${Math.min(unreadHigh.length, 10)} उच्च-प्राथमिकता समाचार पढ़ें।`,
      href: '/news?priority=high',
      cta: { en: 'Open today\'s list', hi: 'आज की सूची खोलें' },
    });
  }

  if (weak.length) {
    const names = weak.slice(0, 2).map((w) => CATEGORY_MAP[w.category]?.label.en || w.category);
    const namesHi = weak.slice(0, 2).map((w) => CATEGORY_MAP[w.category]?.label.hi || w.category);
    steps.push({
      en: `Your accuracy is lowest in ${names.join(' and ')} (${Math.round(weak[0].accuracy * 100)}%). Take a targeted quiz weighted to those.`,
      hi: `${namesHi.join(' और ')} में आपकी सटीकता सबसे कम है (${Math.round(weak[0].accuracy * 100)}%)। इन पर केंद्रित क्विज़ दें।`,
      href: '/quiz?focus=weak',
      cta: { en: 'Targeted quiz', hi: 'लक्षित क्विज़' },
    });
  } else if (acc.seen < 10) {
    steps.push({
      en: 'Take a 10-question quiz. Until you attempt questions, this app cannot tell you what you are weak at.',
      hi: '10 प्रश्नों की क्विज़ दें। जब तक आप प्रश्न हल नहीं करेंगे, ऐप आपकी कमज़ोरी नहीं बता सकता।',
      href: '/quiz',
      cta: { en: 'Take quiz', hi: 'क्विज़ दें' },
    });
  }

  if (mistakes.length >= 5) {
    steps.push({
      en: `${mistakes.length} questions sit unresolved in your Mistake Book. A wrong answer you never revisit is a mark you will lose again.`,
      hi: `आपकी गलती पुस्तिका में ${mistakes.length} प्रश्न अनसुलझे हैं। जिस गलती को दोबारा नहीं देखा, वह फिर से अंक गँवाएगी।`,
      href: '/mistakes',
      cta: { en: 'Clear mistakes', hi: 'गलतियाँ सुधारें' },
    });
  }

  if (!steps.length) {
    steps.push({
      en: 'Nothing is overdue. Read today\'s top stories and take the daily quiz to keep the streak alive.',
      hi: 'कुछ भी बकाया नहीं। आज की प्रमुख खबरें पढ़ें और दैनिक क्विज़ देकर निरंतरता बनाए रखें।',
      href: '/news',
      cta: { en: 'Today\'s affairs', hi: 'आज के समाचार' },
    });
  }

  let headline: Advice['headline'];
  if (dte !== null && dte >= 0 && dte <= 30) {
    headline = {
      en: `${dte} days to ${examName}. Revision and mistake-clearing beat new reading now.`,
      hi: `${examName} में ${dte} दिन शेष। अब नया पढ़ने से बेहतर है रिवीज़न और गलतियाँ सुधारना।`,
    };
  } else if (due.length > 8) {
    headline = {
      en: `Revision backlog is building — ${due.length} items due. Clear it before it compounds.`,
      hi: `रिवीज़न का बैकलॉग बढ़ रहा है — ${due.length} बकाया। बढ़ने से पहले पूरा करें।`,
    };
  } else if (acc.seen >= 20 && acc.pct >= 75) {
    headline = {
      en: `${acc.pct}% accuracy across ${acc.seen} questions. Push into harder ground today.`,
      hi: `${acc.seen} प्रश्नों में ${acc.pct}% सटीकता। आज कठिन विषयों की ओर बढ़ें।`,
    };
  } else {
    headline = {
      en: `${high.length} high-priority stories today for ${examName}.`,
      hi: `${examName} हेतु आज ${high.length} उच्च-प्राथमिकता समाचार।`,
    };
  }

  return { headline, steps: steps.slice(0, 3) };
}

export function greeting(lang: Lang): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())
  );
  if (hour < 12) return lang === 'hi' ? 'सुप्रभात' : 'Good morning';
  if (hour < 17) return lang === 'hi' ? 'नमस्कार' : 'Good afternoon';
  return lang === 'hi' ? 'शुभ संध्या' : 'Good evening';
}

export const tt = t;
export type { CategoryId };
