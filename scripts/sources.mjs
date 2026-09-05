// ---------------------------------------------------------------------------
// Feed registry.
//
// tier: 'primary'   → the body itself published this (government / regulator)
//       'verified'  → established newsroom with an editorial process
//       'unverified'→ aggregator; headline may be accurate but is unconfirmed
//
// Every entry here was reachability-tested. Entries that break are skipped at
// runtime and reported in the run summary rather than failing the build.
// ---------------------------------------------------------------------------

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export const SOURCES = [
  // ---- Primary: Government of India ---------------------------------------
  {
    id: 'pib',
    name: 'Press Information Bureau (PIB)',
    homepage: 'https://pib.gov.in',
    url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
    tier: 'primary',
    lang: 'hi',
    // PIB's RSS carries only title + link; the body lives on the release page.
    hydrate: 'pib',
    weight: 2.0,
    defaultCategories: ['national'],
  },

  // ---- Verified newsrooms --------------------------------------------------
  { id: 'hindu-national', name: 'The Hindu — National', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss', tier: 'verified', weight: 1.5,
    defaultCategories: ['national'] },
  { id: 'hindu-intl', name: 'The Hindu — International', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/news/international/feeder/default.rss', tier: 'verified', weight: 1.45,
    defaultCategories: ['international'] },
  { id: 'hindu-economy', name: 'The Hindu — Economy', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/business/Economy/feeder/default.rss', tier: 'verified', weight: 1.5,
    defaultCategories: ['economy'] },
  { id: 'hindu-scitech', name: 'The Hindu — Science & Tech', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/sci-tech/feeder/default.rss', tier: 'verified', weight: 1.4,
    defaultCategories: ['scitech'] },
  { id: 'hindu-science', name: 'The Hindu — Science', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/sci-tech/science/feeder/default.rss', tier: 'verified', weight: 1.35,
    defaultCategories: ['scitech'] },
  { id: 'hindu-env', name: 'The Hindu — Environment', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss', tier: 'verified', weight: 1.5,
    defaultCategories: ['environment'] },
  { id: 'hindu-education', name: 'The Hindu — Education', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/education/feeder/default.rss', tier: 'verified', weight: 1.2,
    defaultCategories: ['education'] },
  { id: 'hindu-sport', name: 'The Hindu — Sport', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/sport/feeder/default.rss', tier: 'verified', weight: 1.0,
    defaultCategories: ['sports'] },
  { id: 'hindu-bihar', name: 'The Hindu — Bihar', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/news/national/bihar/feeder/default.rss', tier: 'verified', weight: 1.5,
    defaultCategories: ['state'], state: 'bihar' },

  { id: 'ie-india', name: 'The Indian Express — India', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/india/feed/', tier: 'verified', weight: 1.4,
    defaultCategories: ['national'] },
  { id: 'ie-explained', name: 'The Indian Express — Explained', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/explained/feed/', tier: 'verified', weight: 1.6,
    defaultCategories: [] },
  { id: 'ie-economy', name: 'The Indian Express — Economy', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/business/economy/feed/', tier: 'verified', weight: 1.4,
    defaultCategories: ['economy'] },
  { id: 'ie-tech', name: 'The Indian Express — Technology', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/technology/feed/', tier: 'verified', weight: 1.2,
    defaultCategories: ['scitech'] },
  { id: 'ie-polpulse', name: 'The Indian Express — Political Pulse', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/political-pulse/feed/', tier: 'verified', weight: 1.15,
    defaultCategories: ['polity'] },
  { id: 'ie-patna', name: 'The Indian Express — Patna', homepage: 'https://indianexpress.com',
    url: 'https://indianexpress.com/section/cities/patna/feed/', tier: 'verified', weight: 1.45,
    defaultCategories: ['state'], state: 'bihar' },

  { id: 'mint-economy', name: 'Mint — Economy', homepage: 'https://www.livemint.com',
    url: 'https://www.livemint.com/rss/economy', tier: 'verified', weight: 1.3,
    defaultCategories: ['economy'] },
  { id: 'mint-science', name: 'Mint — Science', homepage: 'https://www.livemint.com',
    url: 'https://www.livemint.com/rss/science', tier: 'verified', weight: 1.1,
    defaultCategories: ['scitech'] },
  { id: 'bl-economy', name: 'BusinessLine — Economy', homepage: 'https://www.thehindubusinessline.com',
    url: 'https://www.thehindubusinessline.com/economy/feeder/default.rss', tier: 'verified', weight: 1.3,
    defaultCategories: ['economy'] },

  // ---- Aggregated topic queries (marked unverified; used for coverage gaps)
  {
    id: 'gn-bihar', name: 'Google News — Bihar Government', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=%22Bihar+government%22+OR+%22Bihar+cabinet%22+OR+%22Bihar+scheme%22+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.2, defaultCategories: ['state'], state: 'bihar', aggregator: true,
  },
  {
    id: 'gn-schemes', name: 'Google News — Government Schemes', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=%22launched%22+(yojana+OR+scheme+OR+mission)+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.1, defaultCategories: ['schemes'], aggregator: true,
  },
  {
    id: 'gn-appointments', name: 'Google News — Appointments & Awards', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(appointed+OR+%22takes+charge%22+OR+%22conferred%22+OR+award)+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.05, defaultCategories: ['appointments'], aggregator: true,
  },
  {
    id: 'gn-reports', name: 'Google News — Reports & Indices', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(%22index%22+OR+%22ranking%22+OR+%22report+released%22)+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.1, defaultCategories: ['reports'], aggregator: true,
  },
  {
    id: 'gn-defence', name: 'Google News — Defence', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(DRDO+OR+%22Indian+Army%22+OR+%22Indian+Navy%22+OR+missile+OR+%22defence+ministry%22)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.15, defaultCategories: ['defence'], aggregator: true,
  },
  {
    id: 'gn-isro', name: 'Google News — ISRO & Space', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(ISRO+OR+%22space+mission%22+OR+satellite)+India+when:3d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.2, defaultCategories: ['scitech'], aggregator: true,
  },
  {
    id: 'gn-rbi', name: 'Google News — RBI & Banking', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(RBI+OR+%22Reserve+Bank%22+OR+SEBI+OR+%22monetary+policy%22)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.25, defaultCategories: ['economy'], aggregator: true,
  },
  {
    id: 'gn-sc', name: 'Google News — Supreme Court', homepage: 'https://news.google.com',
    // Scoped to India explicitly — an unscoped "Supreme Court" query pulls in
    // US state litigation that is irrelevant to any Indian exam.
    url: 'https://news.google.com/rss/search?q=(%22Supreme+Court+of+India%22+OR+%22Supreme+Court%22+India)+(verdict+OR+judgment+OR+bench+OR+constitutional)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.15, defaultCategories: ['judiciary'], aggregator: true,
  },

  // --- Added after CI showed Indian Express blocking datacenter IP ranges. The
  // IE feeds are kept (they work from residential networks and for local runs)
  // but these carry the load when they 403 from a GitHub runner. --------------
  { id: 'hindu-states', name: 'The Hindu — Other States', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/news/national/other-states/feeder/default.rss', tier: 'verified', weight: 1.3,
    defaultCategories: ['state'] },
  { id: 'hindu-agri', name: 'The Hindu — Agri Business', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/business/agri-business/feeder/default.rss', tier: 'verified', weight: 1.35,
    defaultCategories: ['agriculture'] },
  { id: 'hindu-editorial', name: 'The Hindu — Editorial', homepage: 'https://www.thehindu.com',
    url: 'https://www.thehindu.com/opinion/editorial/feeder/default.rss', tier: 'verified', weight: 1.4,
    defaultCategories: [] },
  { id: 'bl-national', name: 'BusinessLine — National', homepage: 'https://www.thehindubusinessline.com',
    url: 'https://www.thehindubusinessline.com/news/national/feeder/default.rss', tier: 'verified', weight: 1.2,
    defaultCategories: ['national'] },
  { id: 'et-economy', name: 'The Economic Times — Economy', homepage: 'https://economictimes.indiatimes.com',
    url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms', tier: 'verified', weight: 1.35,
    defaultCategories: ['economy'] },
  { id: 'et-top', name: 'The Economic Times — Top Stories', homepage: 'https://economictimes.indiatimes.com',
    url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', tier: 'verified', weight: 1.1,
    defaultCategories: [] },
  { id: 'toi-india', name: 'The Times of India — India', homepage: 'https://timesofindia.indiatimes.com',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', tier: 'verified', weight: 1.05,
    defaultCategories: ['national'] },
  { id: 'ndtv-india', name: 'NDTV — India', homepage: 'https://www.ndtv.com',
    url: 'https://feeds.feedburner.com/ndtvnews-india-news', tier: 'verified', weight: 1.05,
    defaultCategories: ['national'] },
  { id: 'mint-politics', name: 'Mint — Politics', homepage: 'https://www.livemint.com',
    url: 'https://www.livemint.com/rss/politics', tier: 'verified', weight: 1.1,
    defaultCategories: ['polity'] },

  // --- Topic queries covering syllabus areas the newsroom feeds under-serve --
  {
    id: 'gn-explained', name: 'Google News — Explained & Policy', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(%22explained%22+OR+%22what+is%22)+India+policy+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.25, defaultCategories: [], aggregator: true,
  },
  {
    id: 'gn-polity', name: 'Google News — Polity & Constitution', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(%22Supreme+Court%22+OR+Parliament+OR+constitutional+OR+%22Election+Commission%22)+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.2, defaultCategories: ['polity'], aggregator: true,
  },
  {
    id: 'gn-env', name: 'Google News — Environment & Ecology', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(environment+OR+climate+OR+tiger+OR+biodiversity+OR+wetland)+India+when:3d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.2, defaultCategories: ['environment'], aggregator: true,
  },
  {
    id: 'gn-agri', name: 'Google News — Agriculture', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(agriculture+OR+farmers+OR+MSP+OR+crop+OR+irrigation)+India+government+when:3d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.15, defaultCategories: ['agriculture'], aggregator: true,
  },
  {
    id: 'gn-health', name: 'Google News — Health', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(%22health+ministry%22+OR+WHO+OR+vaccine+OR+ICMR+OR+outbreak)+India+when:3d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.1, defaultCategories: ['health'], aggregator: true,
  },
  {
    id: 'gn-heritage', name: 'Google News — Heritage, GI & UNESCO', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=(UNESCO+OR+Ramsar+OR+%22GI+tag%22+OR+%22world+heritage%22+OR+%22geographical+indication%22)+India+when:5d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.3, defaultCategories: ['environment'], aggregator: true,
  },
  {
    id: 'gn-bihar2', name: 'Google News — Bihar Development', homepage: 'https://news.google.com',
    url: 'https://news.google.com/rss/search?q=Bihar+(Patna+OR+Nitish+OR+budget+OR+infrastructure+OR+appointment)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    tier: 'unverified', weight: 1.25, defaultCategories: ['state'], state: 'bihar', aggregator: true,
  },
];

export const TIER_TRUST = { primary: 1.0, verified: 0.85, unverified: 0.6 };
