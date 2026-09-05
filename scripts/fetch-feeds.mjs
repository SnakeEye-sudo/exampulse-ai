import { XMLParser } from 'fast-xml-parser';
import { SOURCES, BROWSER_UA, TIER_TRUST } from './sources.mjs';
import { publisherVerdict } from './publishers.mjs';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  processEntities: true,
});

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const text = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return String(v['#text'] ?? v['@_href'] ?? '');
  return '';
};

export function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * PIB answers with HTTP 403 while still returning a valid RSS body, and rejects
 * non-browser user agents outright. So: always send a browser UA, and judge the
 * response by whether the body parses — never by the status code alone.
 */
async function get(url, { timeout = 25000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
      },
    });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

/** Google News wraps titles as "Headline - Publisher". Recover the publisher. */
function splitAggregatorTitle(title) {
  const i = title.lastIndexOf(' - ');
  if (i > 20 && title.length - i < 60) {
    return { title: title.slice(0, i).trim(), publisher: title.slice(i + 3).trim() };
  }
  return { title, publisher: null };
}

function parseFeed(xml, src) {
  let doc;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomItems = asArray(doc?.feed?.entry);
  const raw = rssItems.length ? rssItems : atomItems;

  return raw
    .map((it) => {
      const title = stripHtml(text(it.title));
      let link = text(it.link) || text(it.guid);
      if (!link && it.link) link = asArray(it.link).map((l) => text(l['@_href']) || text(l)).find(Boolean) || '';
      const pub = text(it.pubDate) || text(it.published) || text(it.updated) || text(it['dc:date']);
      const desc = stripHtml(
        text(it.description) || text(it.summary) || text(it['content:encoded']) || text(it.content)
      );
      if (!title || !link) return null;

      let displayTitle = title;
      let publisher = null;
      let recognisedPublisher = false;
      if (src.aggregator) {
        const s = splitAggregatorTitle(title);
        displayTitle = s.title;
        publisher = s.publisher;
        const v = publisherVerdict(publisher);
        if (v.verdict === 'reject') return null;   // social repost / content farm
        recognisedPublisher = v.recognised;
      }

      let publishedAt = null;
      if (pub) {
        const d = new Date(pub);
        if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
      }

      return {
        sourceId: src.id,
        sourceName: publisher ? `${publisher} (via ${src.name})` : src.name,
        homepage: src.homepage,
        tier: src.tier,
        trust: TIER_TRUST[src.tier] * (src.aggregator && !recognisedPublisher ? 0.75 : 1),
        weight: src.weight * (src.aggregator && !recognisedPublisher ? 0.7 : 1),
        recognisedPublisher: src.aggregator ? recognisedPublisher : true,
        defaultCategories: src.defaultCategories || [],
        state: src.state || null,
        hydrate: src.hydrate || null,
        title: displayTitle,
        link: link.trim(),
        body: desc,
        publishedAt,
      };
    })
    .filter(Boolean);
}

/** PIB release pages: pull ministry, timestamp and the release body. */
export async function hydratePib(item) {
  try {
    const { body: html } = await get(item.link, { timeout: 20000 });
    if (!html || html.length < 500) return item;
    const clean = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ');
    const start = clean.indexOf('innner-page-main-about-us-content-right-part');
    let end = clean.indexOf('class="ReleaseLang"');
    if (end < 0) end = clean.indexOf('id="PdfDiv"');
    if (start < 0 || end <= start) return item;
    const seg = clean.slice(start, end);
    const txt = stripHtml(seg).replace(/^innner-page-main-about-us-content-right-part">?/, '').trim();
    if (txt.length < 60) return item;

    // Ministry is the first line; the dateline follows "प्रविष्टि तिथि:" / "Posted On:".
    const ministry = txt.split(/\s{2,}|\n/)[0]?.slice(0, 90) || null;
    const dm = txt.match(/(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
    let publishedAt = item.publishedAt;
    if (dm) {
      const d = new Date(`${dm[1]} ${dm[2]} GMT+0530`);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    const cleaned = txt
      .replace(/\(रिलीज़ आईडी[^)]*\)/g, '')
      .replace(/\(Release ID[^)]*\)/gi, '')
      .replace(/आगंतुक पटल\s*:\s*\d+/g, '')
      .replace(/Visitor Counter\s*:\s*\d+/gi, '')
      .replace(/\*{3,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { ...item, body: cleaned.slice(0, 4000), ministry, publishedAt };
  } catch {
    return item;
  }
}

export async function fetchAllFeeds({ log = console.log } = {}) {
  const report = [];
  const settled = await Promise.all(
    SOURCES.map(async (src) => {
      try {
        const { status, body } = await get(src.url);
        const items = parseFeed(body, src);
        report.push({ id: src.id, name: src.name, status, items: items.length, ok: items.length > 0 });
        return items;
      } catch (err) {
        report.push({ id: src.id, name: src.name, status: 0, items: 0, ok: false, error: String(err?.message || err) });
        return [];
      }
    })
  );

  const items = settled.flat();
  for (const r of report) {
    log(`  ${r.ok ? '✓' : '✗'} ${String(r.items).padStart(3)} items  [${r.status}]  ${r.name}${r.error ? ` — ${r.error}` : ''}`);
  }
  return { items, report };
}
