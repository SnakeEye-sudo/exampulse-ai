import { EXAMS, CATEGORIES } from '../src/lib/taxonomy.ts';

// Models get retired without warning; an unattended daily job must survive that.
// We walk this chain and stick with the first one that answers.
const MODEL_CHAIN = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []).concat([
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
]);
let ACTIVE_MODEL = MODEL_CHAIN[0];
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const EXAM_IDS = EXAMS.map((e) => e.id);

// ---------------------------------------------------------------------------
// The contract with the model.
//
// The single most important rule in this file is the separation between
// CURRENT facts (which may only come from the supplied source text) and STATIC
// background (which may come from the model's settled textbook knowledge).
// Conflating the two is how a study app quietly teaches someone wrong facts
// and costs them marks. So it is stated three times, in three ways.
// ---------------------------------------------------------------------------
const SYSTEM = `You are the content engine of ExamPulse AI, a current-affairs revision platform for Indian government-exam aspirants (UPSC, BPSC, State PCS, SSC, Banking, Railway, Defence, Police, Teaching).

You will be given raw news items. For each, produce exam-oriented study material.

ABSOLUTE RULES — violating these makes the output worthless:

1. CURRENT FACTS: Every claim about what happened — names, numbers, dates, ranks, amounts, places, quotes — must come ONLY from the supplied source text. If the source text is just a headline, say only what the headline supports. NEVER invent a statistic, a date, a rank, an amount, or a quotation.
2. STATIC BACKGROUND: For "background", "staticFacts", "organisations" and "terminology" you MAY use settled, textbook-stable general knowledge (constitutional articles, when an organisation was founded, where its headquarters is, what a term means). This is encouraged — it is the main value of the product. But it must be knowledge you are confident is stable and correct, not a guess about this specific news event.
3. If the source text is too thin to support real analysis, set "thin": true and keep the output short and honest rather than padding it.
4. NEUTRALITY: Report factually. No political praise or criticism, no adjectives of approval. Describe what a government or party did, not whether it was good.
5. Never present opinion as fact. Never editorialise.
6. Hindi ("hi") must be natural exam-Hindi as used in BPSC/UPSC Hindi-medium material, not literal machine translation. Keep widely-used English technical terms in Devanagari transliteration where that is what aspirants actually read (e.g. "रेपो रेट", "सूचकांक").

MCQ RULES:
- Questions must be answerable from the material you yourself produced in the same object. No outside facts.
- Use the real exam formats: statement-based ("Consider the following statements..."), assertion-reason, match-the-following, chronology, multiple-correct, and current+static linkage.
- Exactly 4 options. "answer" is the 0-based index. Options must be plausible — no filler like "None of these" unless it is genuinely the answer.
- The explanation must teach: say why the right option is right AND why the tempting wrong one is wrong.
- QUANTITY IS MANDATORY: produce at least 2 MCQs per item, and 4 when relevance.score is 4 or 5. Vary the format across the set — a set of four identical "Consider the following statements" questions is a failure. Mix in one static-GK linkage question that tests the background knowledge, not just the headline.

SCORING:
- relevance.score 5 = near-certain to appear in some exam this cycle (major scheme, index, constitutional development, RBI policy, landmark verdict, major appointment).
- 4 = strong probability, standard current-affairs fare.
- 3 = worth knowing, moderate.
- 2 = marginal.
- 1 = of little exam value.
Be strict. Most news is a 2 or 3. A day should not be full of 5s.`;

const schemaForItem = () => ({
  type: 'OBJECT',
  properties: {
    idx: { type: 'INTEGER', description: 'The index of the input item this object answers.' },
    thin: { type: 'BOOLEAN' },
    title: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
    summary: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'],
      description: 'WHAT HAPPENED. 2-3 sentences, strictly from the source text.' },
    whyImportant: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'],
      description: 'WHY IT MATTERS. Significance in the real world, 1-2 sentences.' },
    examAngle: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'],
      description: 'WHY IT MATTERS IN AN EXAM. What specifically could be asked, and in which paper.' },
    background: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'],
      description: 'Settled background context an aspirant needs. Textbook knowledge allowed here.' },
    staticFacts: {
      type: 'ARRAY', description: '3-6 memorisable static-GK points connected to this news.',
      items: { type: 'OBJECT', properties: {
        kind: { type: 'STRING' },
        point: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
      }, required: ['point'] },
    },
    organisations: {
      type: 'ARRAY', description: 'Organisations involved, with HQ/founded/parent-ministry style notes.',
      items: { type: 'OBJECT', properties: {
        name: { type: 'STRING' },
        note: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
      }, required: ['name', 'note'] },
    },
    terminology: {
      type: 'ARRAY', description: 'Technical terms an aspirant must be able to define.',
      items: { type: 'OBJECT', properties: {
        term: { type: 'STRING' },
        meaning: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
      }, required: ['term', 'meaning'] },
    },
    pyq: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'],
      description: 'How this topic has historically been tested. Describe the PATTERN of past questions; do not fabricate a specific year and question unless you are certain.' },
    categories: { type: 'ARRAY', items: { type: 'STRING', enum: CATEGORY_IDS } },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    relevance: {
      type: 'OBJECT',
      properties: {
        score: { type: 'INTEGER' },
        priority: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        rationale: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
      },
      required: ['score', 'priority', 'rationale'],
    },
    exams: { type: 'ARRAY', items: { type: 'STRING', enum: EXAM_IDS } },
    syllabus: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: {
        exam: { type: 'STRING', enum: EXAM_IDS },
        paper: { type: 'STRING' },
        topic: { type: 'STRING' },
      }, required: ['exam', 'paper', 'topic'] },
    },
    mcqs: {
      type: 'ARRAY', minItems: 2, maxItems: 5,
      description: 'MANDATORY: at least 2 questions, and 4 for a high-relevance item. Vary the type across the set — do not make every question a statement-based one.',
      items: { type: 'OBJECT', properties: {
        type: { type: 'STRING', enum: ['statement', 'multiple-correct', 'match', 'assertion-reason', 'chronology', 'static-link', 'direct'] },
        difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard'] },
        question: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
        options: { type: 'OBJECT', properties: {
          en: { type: 'ARRAY', items: { type: 'STRING' } },
          hi: { type: 'ARRAY', items: { type: 'STRING' } },
        }, required: ['en', 'hi'] },
        answer: { type: 'INTEGER' },
        explanation: { type: 'OBJECT', properties: { en: { type: 'STRING' }, hi: { type: 'STRING' } }, required: ['en', 'hi'] },
      }, required: ['type', 'difficulty', 'question', 'options', 'answer', 'explanation'] },
    },
  },
  required: ['idx', 'title', 'summary', 'whyImportant', 'examAngle', 'background', 'staticFacts',
    'categories', 'relevance', 'exams', 'syllabus', 'mcqs'],
});

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { items: { type: 'ARRAY', items: schemaForItem() } },
  required: ['items'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(apiKey, prompt, { retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT(ACTIVE_MODEL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 40000,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
          safetySettings: [
            'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT',
          ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
        }),
      });

      // 404 = this model was retired. Advance the chain and retry immediately.
      if (res.status === 404) {
        const i = MODEL_CHAIN.indexOf(ACTIVE_MODEL);
        const next = MODEL_CHAIN[i + 1];
        if (next) {
          console.log(`     model ${ACTIVE_MODEL} unavailable → falling back to ${next}`);
          ACTIVE_MODEL = next;
          continue;
        }
        throw new Error(`no usable Gemini model: ${(await res.text()).slice(0, 200)}`);
      }
      if (res.status === 429 || res.status >= 503) {
        // 503 often means one model is hot; try a sibling before waiting it out.
        if (res.status === 503) {
          const i = MODEL_CHAIN.indexOf(ACTIVE_MODEL);
          const next = MODEL_CHAIN[i + 1];
          if (next && attempt < 2) { console.log(`     ${ACTIVE_MODEL} overloaded → ${next}`); ACTIVE_MODEL = next; continue; }
        }
        const wait = Math.min(60000, 4000 * 2 ** attempt);
        console.log(`     rate/server ${res.status}, backing off ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const data = await res.json();
      const cand = data?.candidates?.[0];
      const text = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
      if (!text) throw new Error(`empty response (finishReason=${cand?.finishReason})`);
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw lastErr;
}

function buildPrompt(batch, ctx) {
  const lines = batch.map((it, i) => {
    const body = (it.body || '').slice(0, 2600);
    return [
      `### ITEM ${i}`,
      `Source: ${it.sourceName} (trust tier: ${it.tier})`,
      it.ministry ? `Issuing body: ${it.ministry}` : null,
      `Published: ${it.publishedAt || 'unknown'}`,
      `Pre-classified categories: ${(it.categories || []).join(', ') || 'none'}`,
      it.state ? `State signal: ${it.state}` : null,
      `HEADLINE: ${it.title}`,
      body ? `SOURCE TEXT: ${body}` : 'SOURCE TEXT: (none — only the headline is available. Be honest about the limits of what you can say.)',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return `Today is ${ctx.today} (Asia/Kolkata). Process the ${batch.length} news item(s) below.

Return one object per item, with "idx" matching the ITEM number.

${lines}`;
}

/**
 * Enrich in small batches. Small because quality degrades when the model is
 * asked to hold too many unrelated stories in one response, and because it
 * keeps us comfortably inside the free-tier rate limit.
 */
export async function enrichAll(items, { apiKey, today, batchSize = 3, pauseMs = 4500, log = console.log }) {
  const out = [];
  const failures = [];
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    log(`  batch ${b + 1}/${batches.length} (${batch.length} items)…`);
    try {
      const res = await callGemini(apiKey, buildPrompt(batch, { today }));
      const byIdx = new Map((res.items || []).map((o) => [Number(o.idx), o]));
      batch.forEach((src, i) => {
        const enr = byIdx.get(i);
        if (enr) out.push({ src, enr });
        else { failures.push({ title: src.title, reason: 'missing idx in response' }); out.push({ src, enr: null }); }
      });
    } catch (err) {
      log(`     ✗ ${String(err.message || err).slice(0, 160)}`);
      batch.forEach((src) => { failures.push({ title: src.title, reason: String(err.message || err).slice(0, 120) }); out.push({ src, enr: null }); });
    }
    if (b < batches.length - 1) await sleep(pauseMs);
  }
  return { out, failures };
}

export const activeModel = () => ACTIVE_MODEL;
export const MODEL = MODEL_CHAIN[0];
