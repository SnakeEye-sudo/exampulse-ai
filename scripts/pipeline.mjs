#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ExamPulse AI — daily ingestion pipeline.
//
//   feeds → hydrate → classify → dedupe → rank → enrich → JSON on disk
//
// Runs unattended in GitHub Actions. It is written to degrade rather than fail:
// a dead feed, a rate-limited model or a malformed response costs you some
// articles, never the day's build.
// ---------------------------------------------------------------------------
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fetchAllFeeds, hydratePib } from './fetch-feeds.mjs';
import { preClassify, dedupe, rankAndSelect, normTitle, tokens } from './rank.mjs';
import { enrichAll, MODEL, activeModel } from './enrich.mjs';
import { CATEGORIES, EXAM_MAP } from '../src/lib/taxonomy.ts';
import { rebuildDerived, readJson, writeJson, DATA, PIPELINE_VERSION } from './derive.mjs';

const VALID_CATS = new Set(CATEGORIES.map((c) => c.id));
const VALID_EXAMS = new Set(Object.keys(EXAM_MAP));

const IST = 'Asia/Kolkata';
const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const bi = (v, fb = '') => ({ en: String(v?.en ?? fb ?? '').trim(), hi: String(v?.hi ?? '').trim() });

// ---------------------------------------------------------------------------
// Assembly + validation. Anything the model returns is treated as untrusted:
// enums are checked, indexes are bounds-checked, options are length-checked.
// A malformed MCQ is dropped, not shipped to a student as a broken question.
// ---------------------------------------------------------------------------

function buildMcqs(enr, articleId, cats, exams, title) {
  const out = [];
  for (const [i, m] of (enr.mcqs || []).entries()) {
    const en = (m.options?.en || []).map((s) => String(s).trim()).filter(Boolean);
    let hi = (m.options?.hi || []).map((s) => String(s).trim()).filter(Boolean);
    if (en.length !== 4) continue;
    if (hi.length !== 4) hi = en;
    const answer = Number(m.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    const q = bi(m.question);
    if (!q.en) continue;
    out.push({
      id: `${articleId}-q${i + 1}`,
      articleId,
      type: m.type || 'direct',
      question: { en: q.en, hi: q.hi || q.en },
      options: { en, hi },
      answer,
      explanation: (() => { const e = bi(m.explanation); return { en: e.en, hi: e.hi || e.en }; })(),
      difficulty: ['easy', 'medium', 'hard'].includes(m.difficulty) ? m.difficulty : 'medium',
      categories: cats,
      exams,
      articleTitle: title,
    });
  }
  return out;
}

function assemble(src, enr, today) {
  const id = sha(`${src.sourceId}|${normTitle(src.title)}`);
  const retrievedAt = new Date().toISOString();

  const source = {
    id: src.sourceId,
    name: src.sourceName,
    url: src.link,
    homepage: src.homepage,
    publishedAt: src.publishedAt,
    retrievedAt,
    // Corroboration from an independent outlet lifts an aggregator headline out
    // of "unverified" — two newsrooms carrying it is the cheapest real check.
    verification:
      src.tier === 'primary' ? 'primary'
      : src.tier === 'verified' ? 'verified'
      : (src.corroboration?.length || 0) >= 1 ? 'verified' : 'unverified',
    aiProcessed: Boolean(enr),
    corroboration: src.corroboration || [],
    ministry: src.ministry || null,
  };

  // Degraded path: the model failed for this item. Ship the verified headline
  // with an explicit flag rather than silently dropping real news.
  if (!enr) {
    const t = { en: src.title, hi: '' };
    return {
      id, slug: slugify(src.title) || id, date: today,
      title: t,
      summary: { en: src.body?.slice(0, 400) || src.title, hi: '' },
      whyImportant: { en: '', hi: '' },
      examAngle: { en: '', hi: '' },
      background: { en: '', hi: '' },
      staticFacts: [], organisations: [], terminology: [], pyq: null,
      categories: (src.categories || ['national']).filter((c) => VALID_CATS.has(c)),
      state: src.state || null,
      tags: [],
      relevance: { score: 2, priority: 'low', rationale: { en: 'Automated analysis unavailable for this item.', hi: 'इस समाचार का स्वतः विश्लेषण उपलब्ध नहीं।' } },
      exams: [], syllabus: [], mcqs: [],
      source, ingestedAt: retrievedAt, degraded: true,
    };
  }

  const cats = [...new Set([...(enr.categories || []), ...(src.categories || [])])]
    .filter((c) => VALID_CATS.has(c)).slice(0, 5);
  if (src.state && !cats.includes('state')) cats.unshift('state');
  const finalCats = cats.length ? cats : ['national'];

  const exams = [...new Set(enr.exams || [])].filter((e) => VALID_EXAMS.has(e));
  let score = Number(enr.relevance?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) score = 3;
  // A model is optimistic about its own material; a thin source cannot be a 5.
  if (enr.thin && score > 3) score = 3;
  if (source.verification === 'unverified' && score > 4) score = 4;

  const priority = ['high', 'medium', 'low'].includes(enr.relevance?.priority)
    ? enr.relevance.priority
    : score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low';

  const title = (() => { const t = bi(enr.title, src.title); return { en: t.en || src.title, hi: t.hi }; })();

  return {
    id,
    slug: slugify(title.en) || id,
    date: today,
    title,
    summary: bi(enr.summary),
    whyImportant: bi(enr.whyImportant),
    examAngle: bi(enr.examAngle),
    background: bi(enr.background),
    staticFacts: (enr.staticFacts || []).filter((f) => f?.point?.en)
      .map((f) => ({ kind: f.kind || undefined, point: bi(f.point) })).slice(0, 8),
    organisations: (enr.organisations || []).filter((o) => o?.name)
      .map((o) => ({ name: String(o.name), note: bi(o.note) })).slice(0, 6),
    terminology: (enr.terminology || []).filter((t) => t?.term)
      .map((t) => ({ term: String(t.term), meaning: bi(t.meaning) })).slice(0, 6),
    pyq: enr.pyq?.en ? bi(enr.pyq) : null,
    categories: finalCats,
    state: src.state || null,
    tags: [...new Set((enr.tags || []).map((t) => String(t).trim()).filter(Boolean))].slice(0, 10),
    relevance: { score, priority, rationale: bi(enr.relevance?.rationale) },
    exams,
    syllabus: (enr.syllabus || []).filter((s) => VALID_EXAMS.has(s?.exam))
      .map((s) => ({ exam: s.exam, paper: String(s.paper || '').slice(0, 60), topic: String(s.topic || '').slice(0, 120) }))
      .slice(0, 8),
    mcqs: buildMcqs(enr, id, finalCats, exams, title),
    source,
    ingestedAt: retrievedAt,
    degraded: Boolean(enr.thin) && !enr.summary?.en,
  };
}

/** Shared similarity test for two enriched articles' title+tag token sets. */
function sameStory(a, b) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  const jac = union ? inter / union : 0;
  const contain = inter / Math.max(1, Math.min(a.size, b.size));
  return jac >= 0.4 || contain >= 0.62;
}

const storyTokens = (a) => tokens(`${a.title.en} ${(a.tags || []).join(' ')}`);

/**
 * Yesterday's slate is not a clean slate. The pre-enrichment filter compares
 * raw feed headlines against already-enriched ones, which are worded very
 * differently, so the same story reappears a day later under a tidier title.
 * This compares like with like: today's enriched articles against the enriched
 * articles of the past week.
 */
function dropAlreadyPublished(articles, priorTokenSets) {
  if (!priorTokenSets.length) return articles;
  const kept = articles.filter((a) => !priorTokenSets.some((prev) => sameStory(storyTokens(a), prev)));
  const removed = articles.length - kept.length;
  if (removed) console.log(`   → dropped ${removed} story/stories already published earlier this week`);
  return kept;
}

function dedupeEnriched(articles) {
  const withTok = articles
    .map((a) => ({ a, tok: tokens(`${a.title.en} ${a.tags.join(' ')}`) }))
    .sort((x, y) => y.a.relevance.score - x.a.relevance.score
      || (y.a.mcqs.length - x.a.mcqs.length)
      || (y.a.source.verification === 'primary' ? 1 : 0) - (x.a.source.verification === 'primary' ? 1 : 0));

  const kept = [];
  for (const cand of withTok) {
    const dup = kept.find((k) => sameStory(cand.tok, k.tok));
    if (dup) {
      dup.a.source.corroboration = [
        ...(dup.a.source.corroboration || []),
        { name: cand.a.source.name, url: cand.a.source.url },
      ].slice(0, 5);
      // A merged story confirmed by another outlet is no longer a lone report.
      if (dup.a.source.verification === 'unverified') dup.a.source.verification = 'verified';
      // Keep the questions — a second angle on the same story is still practice.
      const have = new Set(dup.a.mcqs.map((m) => m.question.en.slice(0, 60)));
      for (const m of cand.a.mcqs) {
        if (dup.a.mcqs.length >= 6) break;
        if (!have.has(m.question.en.slice(0, 60))) { dup.a.mcqs.push(m); have.add(m.question.en.slice(0, 60)); }
      }
    } else {
      kept.push(cand);
    }
  }
  const removed = articles.length - kept.length;
  if (removed) console.log(`   → merged ${removed} near-duplicate stories after enrichment`);
  return kept.map((k) => k.a);
}

// ---------------------------------------------------------------------------
// Derived files
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const today = process.env.PIPELINE_DATE || istDate();
  const limit = Number(process.env.PIPELINE_LIMIT || 42);

  console.log(`\nExamPulse ingestion — ${today} (IST)  model=${MODEL}  limit=${limit}\n`);
  if (!apiKey) {
    console.log('⚠  GEMINI_API_KEY not set. Articles will be stored in degraded (headline-only) form.\n');
  }

  console.log('1. Fetching feeds');
  const { items, report } = await fetchAllFeeds();
  console.log(`   → ${items.length} raw items from ${report.filter((r) => r.ok).length}/${report.length} live feeds\n`);
  if (!items.length) { console.log('No items fetched; leaving existing data untouched.'); return; }

  console.log('2. Hydrating primary sources');
  const needHydrate = items.filter((i) => i.hydrate === 'pib').slice(0, 25);
  let hydrated = 0;
  for (const it of needHydrate) {
    const h = await hydratePib(it);
    if (h.body && h.body.length > (it.body?.length || 0)) { Object.assign(it, h); hydrated++; }
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log(`   → ${hydrated}/${needHydrate.length} PIB releases hydrated\n`);

  console.log('3. Classifying + deduplicating');
  for (const it of items) Object.assign(it, preClassify(it));
  const unique = dedupe(items);
  console.log(`   → ${unique.length} unique stories (${items.length - unique.length} merged as duplicates)\n`);

  console.log('4. Ranking');
  // Do not re-process what we already published in the last week.
  const manifestNow = await readJson(path.join(DATA, 'manifest.json'), { dates: [] });
  const recentDates = (manifestNow.dates || []).slice(-7);
  const seen = [];
  const priorStories = [];
  for (const d of recentDates) {
    if (d === today) continue;              // today's own file is merged, not filtered
    const day = await readJson(path.join(DATA, 'day', `${d}.json`), null);
    for (const a of day?.articles || []) {
      seen.push(tokens(a.title.en));
      priorStories.push(tokens(`${a.title.en} ${(a.tags || []).join(' ')}`));
    }
  }
  const fresh = unique.filter((it) => {
    const tk = tokens(it.title);
    return !seen.some((s) => {
      let inter = 0; for (const x of tk) if (s.has(x)) inter++;
      const j = inter / (tk.size + s.size - inter || 1);
      return j >= 0.6;
    });
  });
  const { picked, considered, eligible } = rankAndSelect(fresh, { limit });
  console.log(`   → considered ${considered}, eligible ${eligible}, selected ${picked.length}` +
              ` (${unique.length - fresh.length} already covered this week)\n`);
  if (!picked.length) { console.log('Nothing new worth publishing today.'); await rebuildDerived(); return; }

  console.log('5. Enrichment');
  let enriched;
  if (apiKey) {
    enriched = await enrichAll(picked, { apiKey, today });
    console.log(`   → ${enriched.out.filter((o) => o.enr).length}/${picked.length} enriched via ${activeModel()}` +
                `${enriched.failures.length ? `, ${enriched.failures.length} failed` : ''}\n`);
  } else {
    enriched = { out: picked.map((src) => ({ src, enr: null })), failures: [] };
  }

  console.log('6. Writing');
  const enrichedCount = enriched.out.filter((o) => o.enr).length;
  if (apiKey && enrichedCount === 0) {
    // The model was configured but nothing came back. Publishing 40 bare
    // headlines would bury today's real material under stubs, and tomorrow's
    // run would then skip those stories as "already covered". Better to leave
    // the archive untouched and let the next run pick them up properly.
    console.log('   ✗ enrichment produced nothing — leaving existing data untouched.');
    console.log('     (feeds were fine; this is an upstream model capacity problem.)');
    await rebuildDerived();
    return;
  }

  // Drop items the model failed on rather than shipping stubs — unless we are
  // deliberately running without AI, where headline-only is the whole point.
  const usable = apiKey ? enriched.out.filter((o) => o.enr) : enriched.out;
  if (apiKey && usable.length < enriched.out.length) {
    console.log(`   → skipping ${enriched.out.length - usable.length} item(s) whose enrichment failed; next run will retry them`);
  }
  let articles = usable.map(({ src, enr }) => assemble(src, enr, today));

  // Second dedupe pass. The model rewrites headlines into a canonical form, so
  // stories that looked different in raw feed wording ("ISRO Deploys India's
  // First Geosynchronous Imaging Satellite" vs "ISRO launches EOS-05") only
  // become comparable now. Keep the best-scored copy and fold the rest in as
  // corroborating sources — which is more useful than deleting them outright.
  articles = dropAlreadyPublished(dedupeEnriched(articles), priorStories);
  if (!articles.length) {
    console.log('   → everything selected today was already covered; nothing new to write.');
    await rebuildDerived();
    return;
  }
  const dayPath = path.join(DATA, 'day', `${today}.json`);
  const existing = await readJson(dayPath, null);
  const merged = [...(existing?.articles || [])];
  const haveIds = new Set(merged.map((a) => a.id));
  for (const a of articles) if (!haveIds.has(a.id)) { merged.push(a); haveIds.add(a.id); }
  merged.sort((a, b) => b.relevance.score - a.relevance.score);

  await writeJson(dayPath, { date: today, generatedAt: new Date().toISOString(), articles: merged });
  const manifest = await rebuildDerived();

  const high = merged.filter((a) => a.relevance.priority === 'high').length;
  const mcqs = merged.reduce((n, a) => n + a.mcqs.length, 0);
  console.log(`   → ${merged.length} articles today (${high} high-priority), ${mcqs} MCQs`);
  console.log(`   → corpus: ${manifest.totalArticles} articles, ${manifest.totalMcqs} MCQs across ${manifest.dates.length} days`);
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

main().catch((e) => { console.error('\nPipeline failed:', e); process.exit(1); });
