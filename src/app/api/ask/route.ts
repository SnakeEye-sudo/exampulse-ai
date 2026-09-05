import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const MODEL_CHAIN = [
  process.env.GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
].filter(Boolean) as string[];

const SYSTEM = `You are ExamPulse AI, a tutor for Indian government-exam aspirants (UPSC, BPSC, State PCS, SSC, Banking, Railway, Defence, Police, Teaching).

Answer in exam-oriented language, and ALWAYS structure the answer into these four parts:
1. currentFacts — what is happening now on this topic. If context articles are supplied below, draw current facts ONLY from them and cite the source name inline. If no context is supplied, say plainly that you cannot confirm the latest position and that the student should check a primary source; do not guess at recent dates, numbers or appointments.
2. background — settled, textbook-stable knowledge: history, constitutional provisions, how the mechanism works, which body is responsible. This is where you should be generous and precise.
3. examFacts — the specific memorisable points most likely to be tested: numbers, articles, years, headquarters, full forms, ranks.
4. possibleQuestions — 3 to 4 questions in the style of the exams named, stated as questions, not answered.

RULES:
- Never invent a statistic, date, rank, amount, scheme name or quotation. If you are not confident, say so in that line.
- Keep current facts and background strictly separate. Conflating them is the single worst failure mode here.
- Be politically neutral. Describe what was done, not whether it was good.
- Be concise and dense. An aspirant reading this at 6am wants signal, not essay padding.
- If the question is not related to exam preparation or general knowledge, say so briefly and stop.
- Answer in the requested language.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    currentFacts: { type: 'ARRAY', items: { type: 'STRING' } },
    background: { type: 'ARRAY', items: { type: 'STRING' } },
    examFacts: { type: 'ARRAY', items: { type: 'STRING' } },
    possibleQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    caveat: { type: 'STRING', description: 'Empty string when there is nothing to warn about.' },
  },
  required: ['topic', 'currentFacts', 'background', 'examFacts', 'possibleQuestions', 'confidence'],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'not_configured', message: 'The AI tutor is not configured on this deployment. Set GEMINI_API_KEY in the project environment variables.' },
      { status: 503 }
    );
  }

  let body: { question?: string; lang?: string; exam?: string; context?: { title: string; summary: string; source: string; date: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const question = String(body.question || '').trim().slice(0, 600);
  if (question.length < 3) return NextResponse.json({ error: 'bad_request', message: 'Question too short.' }, { status: 400 });

  const lang = body.lang === 'hi' ? 'Hindi (Devanagari, exam-Hindi as used in BPSC/UPSC Hindi-medium material)' : 'English';
  const exam = String(body.exam || 'UPSC').slice(0, 24);

  // Grounding: the question is answered against what the app actually holds,
  // so "current facts" have a source the student can open and check.
  const context = (body.context || []).slice(0, 6);
  const contextBlock = context.length
    ? `\n\nCONTEXT — these are the articles this app currently holds on the topic. Current facts must come from here:\n${context
        .map((c, i) => `[${i + 1}] ${c.date} · ${c.source}\nTitle: ${c.title}\nSummary: ${c.summary}`)
        .join('\n\n')}`
    : '\n\nCONTEXT: none available. Say clearly in currentFacts that you cannot confirm the current position from this app\'s archive.';

  const prompt = `Student is preparing for: ${exam}. Answer in ${lang}.\n\nQUESTION: ${question}${contextBlock}`;

  let lastError = '';
  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 12000,
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
          },
        }),
      });

      if (res.status === 404 || res.status === 503) { lastError = `model ${model}: ${res.status}`; continue; }
      if (res.status === 429) {
        return NextResponse.json({ error: 'rate_limited', message: 'The free AI quota for today is used up. Try again later.' }, { status: 429 });
      }
      if (!res.ok) { lastError = `${res.status}: ${(await res.text()).slice(0, 200)}`; continue; }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || '';
      if (!text) { lastError = 'empty response'; continue; }
      return NextResponse.json({ ...JSON.parse(text), model, grounded: context.length > 0 });
    } catch (err) {
      lastError = String((err as Error)?.message || err);
    }
  }

  return NextResponse.json({ error: 'upstream', message: lastError || 'All models unavailable.' }, { status: 502 });
}
