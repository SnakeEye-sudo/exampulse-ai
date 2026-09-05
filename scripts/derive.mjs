// ---------------------------------------------------------------------------
// Derived files: the search index, the manifest, and the monthly magazines are
// all reproducible from the day files, so they are regenerated wholesale rather
// than patched. That means any maintenance script can fix a day file and simply
// call rebuildDerived() to make everything else consistent again.
// ---------------------------------------------------------------------------
import fs from 'node:fs/promises';
import path from 'node:path';
import { CATEGORIES } from '../src/lib/taxonomy.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'public', 'data');
export const PIPELINE_VERSION = '1.0.0';

export const readJson = async (p, fb) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fb; } };
export const writeJson = async (p, v) => {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(v, null, 0) + '\n');
};

function toIndexRecord(a) {
  return {
    id: a.id, date: a.date, title: a.title,
    summary: { en: a.summary.en.slice(0, 260), hi: a.summary.hi.slice(0, 260) },
    categories: a.categories, state: a.state,
    score: a.relevance.score, priority: a.relevance.priority,
    exams: a.exams, tags: a.tags,
    sourceName: a.source.name, verification: a.source.verification,
    mcqCount: a.mcqs.length,
  };
}

export async function rebuildDerived() {
  const dayDir = path.join(DATA, 'day');
  const files = (await fs.readdir(dayDir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();

  const index = [];
  const byMonth = new Map();
  let totalArticles = 0, totalMcqs = 0;
  const sourceCounts = new Map();

  for (const f of files) {
    const day = await readJson(path.join(dayDir, f), null);
    if (!day?.articles) continue;
    for (const a of day.articles) {
      index.push(toIndexRecord(a));
      totalArticles++;
      totalMcqs += a.mcqs.length;
      const key = a.source.name;
      const cur = sourceCounts.get(key) || { name: key, count: 0, verification: a.source.verification };
      cur.count++; sourceCounts.set(key, cur);
      const m = a.date.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push(a);
    }
  }

  index.sort((a, b) => (b.date.localeCompare(a.date)) || (b.score - a.score));
  await writeJson(path.join(DATA, 'index.json'), index);

  // Monthly revision magazine: grouped by category, high-value first, plus a
  // question bank drawn from the month's best material.
  const months = [];
  for (const [month, arts] of byMonth) {
    months.push(month);
    const sections = CATEGORIES.map((c) => {
      const inCat = arts.filter((a) => a.categories.includes(c.id))
        .sort((a, b) => b.relevance.score - a.relevance.score || a.date.localeCompare(b.date));
      return {
        category: c.id,
        label: c.label,
        count: inCat.length,
        articles: inCat.slice(0, 30).map((a) => ({
          id: a.id, date: a.date, title: a.title, summary: a.summary,
          staticFacts: a.staticFacts.slice(0, 4), score: a.relevance.score,
          sourceName: a.source.name, verification: a.source.verification,
        })),
      };
    }).filter((s) => s.count > 0);

    const mcqPool = arts
      .filter((a) => a.relevance.score >= 3)
      .flatMap((a) => a.mcqs)
      .sort(() => 0.5 - Math.random())
      .slice(0, 60);

    await writeJson(path.join(DATA, 'monthly', `${month}.json`), {
      month,
      generatedAt: new Date().toISOString(),
      totalArticles: arts.length,
      highPriority: arts.filter((a) => a.relevance.priority === 'high').length,
      sections,
      mcqs: mcqPool,
    });
  }
  months.sort();

  const manifest = {
    generatedAt: new Date().toISOString(),
    dates: files.map((f) => f.replace('.json', '')),
    months,
    totalArticles,
    totalMcqs,
    sources: [...sourceCounts.values()].sort((a, b) => b.count - a.count),
    pipelineVersion: PIPELINE_VERSION,
    aiEnabled: Boolean(process.env.GEMINI_API_KEY),
  };
  await writeJson(path.join(DATA, 'manifest.json'), manifest);
  return manifest;
}


export { DATA, ROOT };
