import { CATEGORIES, STATE_HINTS } from '../src/lib/taxonomy.ts';

const STOP = new Set(('a an the of in on at to for by with and or from as is are was were be been ' +
  'it its this that these those has have had will would can could may might new says said after ' +
  'over amid ahead into out up down more most his her their our your my').split(' '));

export function normTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokens(t) {
  return new Set(normTitle(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Signals that a story is the kind examiners turn into questions. */
const SIGNAL = [
  ['launched', 3], ['inaugurat', 3], ['approved', 3], ['cabinet approved', 4], ['signed', 2.5],
  ['mou', 2.5], ['agreement', 2], ['scheme', 3], ['yojana', 3.5], ['mission', 2.5], ['abhiyan', 3],
  ['index', 3.5], ['ranked', 3], ['ranking', 3], ['report released', 3.5], ['survey', 2],
  ['appointed', 3], ['takes charge', 2.5], ['sworn in', 3], ['elected as', 2.5],
  ['award', 2.5], ['conferred', 3], ['honour', 2], ['prize', 2.5],
  ['supreme court', 3], ['high court', 2], ['verdict', 3], ['constitution', 3.5], ['article ', 2.5],
  ['bill', 2.5], ['parliament', 3], ['amendment', 3], ['ordinance', 2.5],
  ['rbi', 3.5], ['repo rate', 4], ['monetary policy', 3.5], ['inflation', 3], ['gdp', 3.5],
  ['budget', 3], ['fiscal', 2.5], ['sebi', 2.5], ['gst', 2.5],
  ['isro', 3.5], ['satellite', 3], ['drdo', 3], ['missile', 3], ['launch vehicle', 3],
  ['summit', 3], ['g20', 3], ['brics', 3], ['united nations', 3], ['treaty', 3], ['bilateral', 2.5],
  ['tiger', 2.5], ['biodiversity', 3], ['ramsar', 3.5], ['unesco', 3.5], ['climate', 2.5],
  ['world heritage', 3.5], ['gi tag', 4], ['geographical indication', 4],
  ['first ever', 2.5], ['first indian', 3], ['world day', 3], ['national day', 2.5],
  ['exercise', 2], ['joint exercise', 3], ['msp', 3], ['minimum support price', 3.5],
  ['committee', 2], ['commission', 2], ['task force', 2],
];

/** Things a serious aspirant should not be spending morning minutes on. */
const NOISE = [
  ['box office', -6], ['bollywood', -5], ['actor', -3.5], ['actress', -3.5], ['film review', -6],
  ['trailer', -5], ['web series', -5], ['celebrity', -4], ['viral video', -5], ['horoscope', -8],
  ['astrolog', -8], ['recipe', -6], ['fashion', -4], ['gadget review', -4], ['smartphone launch', -3],
  ['stock to buy', -6], ['multibagger', -6], ['ipo listing gain', -4], ['share price target', -6],
  ['live score', -5], ['playing xi', -5], ['match preview', -4], ['transfer rumour', -5],
  ['road accident', -3], ['murder', -3], ['robbery', -3.5], ['arrested for', -2.5],
  ['weather today', -3], ['gold rate', -3], ['petrol price', -2],
];

function hits(text, table) {
  let s = 0;
  const found = [];
  for (const [kw, w] of table) {
    if (text.includes(kw)) { s += w; found.push(kw); }
  }
  return { s, found };
}

/** Whole-word (or whole-phrase) containment, Unicode-safe. */
export function hasWord(hay, needle) {
  const n = needle.trim();
  if (!n) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, 'iu').test(hay);
}

const slugAsName = (slug) => String(slug || '').replace(/-/g, ' ');

export function preClassify(item) {
  const hay = `${item.title} ${item.body}`.toLowerCase();
  const cats = new Set(item.defaultCategories || []);

  for (const c of CATEGORIES) {
    let n = 0;
    for (const h of c.hints) if (hasWord(hay, h)) n++;
    if (n >= 1 && (n >= 2 || (item.defaultCategories || []).length === 0)) cats.add(c.id);
  }

  let state = item.state || null;
  if (!state) {
    let best = null, bestN = 0;
    for (const [slug, hints] of Object.entries(STATE_HINTS)) {
      let n = 0;
      for (const h of hints) if (hasWord(hay, h)) n++;
      if (n > bestN) { bestN = n; best = slug; }
    }
    // One weak place-name is not enough; district names collide with words
    // inside other words (Sriharikota / Kota, Gaya / Vijayawada).
    if (bestN >= 2 || (bestN === 1 && hasWord(hay, slugAsName(best)))) state = best;
  }
  if (state) cats.add('state');
  if (cats.size === 0) cats.add('national');

  return { categories: [...cats].slice(0, 4), state };
}

export function preScore(item, now = Date.now()) {
  const hay = `${item.title} ${item.body}`.toLowerCase();
  const sig = hits(hay, SIGNAL);
  const noi = hits(hay, NOISE);

  const ageHours = item.publishedAt ? (now - new Date(item.publishedAt).getTime()) / 3.6e6 : 24;
  const recency = ageHours <= 24 ? 3 : ageHours <= 48 ? 1.5 : ageHours <= 72 ? 0.5 : -2;

  // Longer bodies give the enrichment model something real to work from.
  const substance = Math.min(3, (item.body?.length || 0) / 400);

  const raw = sig.s + noi.s + recency + substance + item.weight * 2.5 + item.trust * 3;
  return { raw, signals: sig.found.slice(0, 6), noise: noi.found.slice(0, 3), ageHours };
}

/**
 * Collapse near-identical stories across sources. The surviving copy is the one
 * from the most trustworthy source; the others become corroborating references,
 * which is exactly what raises confidence in a claim.
 */
/**
 * Tokens that appear in only a handful of headlines are the ones that identify
 * a story: "EOS-05", "GSLV-F17", "Gaganyaan". Common words ("india", "launch",
 * "first") identify nothing. This builds that rarity map for the whole batch so
 * two headlines can be compared on what actually makes them distinct.
 */
function rarityMap(items) {
  const df = new Map();
  for (const it of items) for (const w of it._tok) df.set(w, (df.get(w) || 0) + 1);
  return df;
}

function rareTokens(tok, df, maxDf) {
  const out = new Set();
  for (const w of tok) if ((df.get(w) || 0) <= maxDf) out.add(w);
  return out;
}

export function dedupe(items) {
  const scored = items.map((it) => ({ ...it, _tok: tokens(`${it.title} ${(it.tags || []).join(' ')}`) }));
  const df = rarityMap(scored);
  const maxDf = Math.max(2, Math.ceil(scored.length * 0.004));
  for (const it of scored) it._rare = rareTokens(it._tok, df, maxDf);
  scored.sort((a, b) => b.trust * b.weight - a.trust * a.weight);

  const kept = [];
  for (const it of scored) {
    const dup = kept.find((k) => {
      const j = jaccard(k._tok, it._tok);
      if (j >= 0.42) return true;
      // "ISRO launches EOS-05" is the same story as "ISRO launches EOS-05 via
      // GSLV-F17; Gaganyaan next" — Jaccard misses that, containment catches it.
      let inter = 0;
      for (const x of it._tok) if (k._tok.has(x)) inter++;
      const smaller = Math.min(k._tok.size, it._tok.size);
      if (smaller >= 3 && inter / smaller >= 0.72) return true;
      // Same story, rewritten headline: two shared identifying tokens is enough
      // ("eos", "gslv"), because those words do not co-occur by accident.
      let shared = 0;
      for (const w of it._rare) if (k._rare.has(w)) shared++;
      return shared >= 2 && j >= 0.2;
    });
    if (dup) {
      dup.corroboration = dup.corroboration || [];
      if (!dup.corroboration.some((c) => c.name === it.sourceName)) {
        dup.corroboration.push({ name: it.sourceName, url: it.link });
      }
      // A longer body from a lesser source still improves the material we send on.
      if ((it.body?.length || 0) > (dup.body?.length || 0) * 1.6) dup.body = it.body;
    } else {
      kept.push(it);
    }
  }
  return kept.map(({ _tok, _rare, ...rest }) => rest);
}

export function rankAndSelect(items, { limit = 45, minRaw = 6, now = Date.now() } = {}) {
  const withScores = items.map((it) => ({ ...it, _score: preScore(it, now) }));
  const eligible = withScores
    .filter((it) => it._score.ageHours <= 96)
    .filter((it) => it._score.raw >= minRaw)
    .sort((a, b) => b._score.raw - a._score.raw);

  // Keep the day varied: no single source may take more than a quarter of the slate.
  const perSourceCap = Math.max(4, Math.ceil(limit / 4));
  const counts = {};
  const picked = [];
  for (const it of eligible) {
    const n = counts[it.sourceId] || 0;
    if (n >= perSourceCap) continue;
    counts[it.sourceId] = n + 1;
    picked.push(it);
    if (picked.length >= limit) break;
  }
  return { picked, considered: withScores.length, eligible: eligible.length };
}
