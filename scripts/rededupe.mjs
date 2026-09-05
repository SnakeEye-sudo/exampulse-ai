#!/usr/bin/env node
// One-off maintenance: re-apply the post-enrichment dedupe to day files that
// were generated before that pass existed, then rebuild the derived files.
// Costs nothing — no model calls, it only reorganises what is already on disk.
import fs from 'node:fs/promises';
import path from 'node:path';
import { tokens } from './rank.mjs';
import { rebuildDerived } from './derive.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DAY = path.join(ROOT, 'public', 'data', 'day');

function dedupeEnriched(articles) {
  const withTok = articles
    .map((a) => ({ a, tok: tokens(`${a.title.en} ${(a.tags || []).join(' ')}`) }))
    .sort((x, y) => y.a.relevance.score - x.a.relevance.score || y.a.mcqs.length - x.a.mcqs.length);
  const kept = [];
  for (const cand of withTok) {
    const dup = kept.find((k) => {
      let inter = 0;
      for (const w of cand.tok) if (k.tok.has(w)) inter++;
      const union = k.tok.size + cand.tok.size - inter;
      const jac = union ? inter / union : 0;
      const contain = inter / Math.max(1, Math.min(k.tok.size, cand.tok.size));
      return jac >= 0.4 || contain >= 0.62;
    });
    if (dup) {
      dup.a.source.corroboration = [
        ...(dup.a.source.corroboration || []),
        { name: cand.a.source.name, url: cand.a.source.url },
      ].slice(0, 5);
      if (dup.a.source.verification === 'unverified') dup.a.source.verification = 'verified';
      const have = new Set(dup.a.mcqs.map((m) => m.question.en.slice(0, 60)));
      for (const m of cand.a.mcqs) {
        if (dup.a.mcqs.length >= 6) break;
        if (!have.has(m.question.en.slice(0, 60))) { dup.a.mcqs.push(m); have.add(m.question.en.slice(0, 60)); }
      }
    } else kept.push(cand);
  }
  return kept.map((k) => k.a);
}

const files = (await fs.readdir(DAY)).filter((f) => f.endsWith('.json')).sort();

// Cross-day pass: a story that reappeared under a tidier headline the next day
// is the same story. The earlier day keeps it.
const published = [];
for (const f of files) {
  const p = path.join(DAY, f);
  const day = JSON.parse(await fs.readFile(p, 'utf8'));
  const before = day.articles.length;
  let arts = dedupeEnriched(day.articles);
  arts = arts.filter((a) => {
    const tok = tokens(`${a.title.en} ${(a.tags || []).join(' ')}`);
    return !published.some((prev) => {
      let inter = 0;
      for (const w of tok) if (prev.has(w)) inter++;
      const union = prev.size + tok.size - inter;
      return (union ? inter / union : 0) >= 0.4 || inter / Math.max(1, Math.min(prev.size, tok.size)) >= 0.62;
    });
  });
  for (const a of arts) published.push(tokens(`${a.title.en} ${(a.tags || []).join(' ')}`));
  day.articles = arts.sort((a, b) => b.relevance.score - a.relevance.score);
  await fs.writeFile(p, JSON.stringify(day, null, 0) + '\n');
  console.log(`${f}: ${before} → ${day.articles.length}`);
}

const m = await rebuildDerived();
console.log(`Rebuilt derived files: ${m.totalArticles} articles, ${m.totalMcqs} MCQs, ${m.dates.length} day(s).`);
