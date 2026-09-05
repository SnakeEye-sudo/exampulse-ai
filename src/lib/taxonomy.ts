import type { CategoryId, ExamId } from './types';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryDef {
  id: CategoryId;
  label: { en: string; hi: string };
  /** Short glyph shown in dense list views. */
  glyph: string;
  /** Keywords used by the deterministic pre-classifier (before the LLM pass). */
  hints: string[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'national', label: { en: 'National', hi: 'राष्ट्रीय' }, glyph: 'NAT',
    hints: ['india', 'union government', 'centre', 'lok sabha', 'rajya sabha', 'prime minister', 'cabinet'] },
  { id: 'international', label: { en: 'International', hi: 'अंतर्राष्ट्रीय' }, glyph: 'INT',
    hints: ['united nations', 'bilateral', 'summit', 'treaty', 'foreign', 'g20', 'brics', 'diplomat', 'wto', 'imf'] },
  { id: 'polity', label: { en: 'Polity & Governance', hi: 'राजव्यवस्था एवं शासन' }, glyph: 'POL',
    hints: ['constitution', 'article', 'amendment', 'parliament', 'bill', 'ordinance', 'governance', 'election commission', 'panchayat'] },
  { id: 'economy', label: { en: 'Economy & Banking', hi: 'अर्थव्यवस्था एवं बैंकिंग' }, glyph: 'ECO',
    hints: ['rbi', 'gdp', 'inflation', 'repo rate', 'fiscal', 'budget', 'bank', 'sebi', 'gst', 'export', 'monetary policy', 'npa'] },
  { id: 'scitech', label: { en: 'Science & Technology', hi: 'विज्ञान एवं प्रौद्योगिकी' }, glyph: 'SCI',
    hints: ['isro', 'satellite', 'drdo', 'vaccine', 'artificial intelligence', 'semiconductor', 'quantum', 'space', 'dna', 'telescope'] },
  { id: 'environment', label: { en: 'Environment & Ecology', hi: 'पर्यावरण एवं पारिस्थितिकी' }, glyph: 'ENV',
    hints: ['climate', 'biodiversity', 'tiger', 'wildlife', 'emission', 'unfccc', 'cop', 'forest', 'ramsar', 'pollution', 'ipcc'] },
  { id: 'defence', label: { en: 'Defence', hi: 'रक्षा' }, glyph: 'DEF',
    hints: ['army', 'navy', 'air force', 'missile', 'exercise', 'indigenous', 'border', 'defence ministry', 'brahmos', 'agni'] },
  { id: 'agriculture', label: { en: 'Agriculture', hi: 'कृषि' }, glyph: 'AGR',
    hints: ['farmer', 'crop', 'msp', 'kharif', 'rabi', 'irrigation', 'fertiliser', 'horticulture', 'agriculture ministry'] },
  { id: 'health', label: { en: 'Health', hi: 'स्वास्थ्य' }, glyph: 'HLT',
    hints: ['who', 'disease', 'health ministry', 'ayushman', 'medical', 'outbreak', 'icmr', 'nutrition', 'malaria', 'tuberculosis'] },
  { id: 'education', label: { en: 'Education', hi: 'शिक्षा' }, glyph: 'EDU',
    hints: ['nep', 'ugc', 'iit', 'school', 'university', 'ncert', 'literacy', 'education ministry', 'cbse'] },
  { id: 'judiciary', label: { en: 'Judiciary', hi: 'न्यायपालिका' }, glyph: 'JUD',
    hints: ['supreme court', 'high court', 'verdict', 'bench', 'chief justice', 'petition', 'tribunal', 'judgment'] },
  { id: 'awards', label: { en: 'Awards & Honours', hi: 'पुरस्कार एवं सम्मान' }, glyph: 'AWD',
    hints: ['award', 'prize', 'honour', 'padma', 'nobel', 'bharat ratna', 'felicitat', 'conferred'] },
  { id: 'appointments', label: { en: 'Appointments', hi: 'नियुक्तियाँ' }, glyph: 'APP',
    hints: ['appointed', 'sworn in', 'takes charge', 'new chief', 'nominated', 'elected as', 'assumes office'] },
  { id: 'reports', label: { en: 'Reports & Indices', hi: 'रिपोर्ट एवं सूचकांक' }, glyph: 'RPT',
    hints: ['index', 'ranking', 'report', 'survey', 'released the', 'ranked', 'global index'] },
  { id: 'sports', label: { en: 'Sports', hi: 'खेल' }, glyph: 'SPT',
    hints: ['olympic', 'world cup', 'medal', 'tournament', 'championship', 'cricket', 'hockey', 'asian games'] },
  { id: 'days', label: { en: 'Important Days', hi: 'महत्वपूर्ण दिवस' }, glyph: 'DAY',
    hints: ['world day', 'national day', 'observed on', 'international day', 'anniversary', 'diwas'] },
  { id: 'schemes', label: { en: 'Government Schemes', hi: 'सरकारी योजनाएँ' }, glyph: 'SCH',
    hints: ['yojana', 'scheme', 'mission', 'abhiyan', 'launched by the government', 'beneficiar', 'pradhan mantri'] },
  { id: 'state', label: { en: 'State Affairs', hi: 'राज्य विशेष' }, glyph: 'STA',
    hints: ['state government', 'chief minister', 'assembly', 'district', 'state cabinet'] },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryDef> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export interface ExamDef {
  id: ExamId;
  label: { en: string; hi: string };
  short: string;
  /** Papers used when mapping an article to the syllabus. */
  papers: string[];
  /** Categories this exam weights most heavily (drives ranking). */
  weights: Partial<Record<CategoryId, number>>;
  blurb: { en: string; hi: string };
}

const W = (o: Partial<Record<CategoryId, number>>) => o;

export const EXAMS: ExamDef[] = [
  {
    id: 'UPSC', short: 'UPSC',
    label: { en: 'UPSC Civil Services', hi: 'यूपीएससी सिविल सेवा' },
    papers: ['GS Paper I', 'GS Paper II', 'GS Paper III', 'GS Paper IV', 'Prelims GS', 'Essay'],
    weights: W({ polity: 1.4, economy: 1.3, environment: 1.35, international: 1.35, scitech: 1.2, reports: 1.25, judiciary: 1.2, schemes: 1.2, national: 1.1, sports: 0.5, awards: 0.7 }),
    blurb: { en: 'Analytical depth, governance and international relations weighted highest.', hi: 'विश्लेषणात्मक गहराई, शासन एवं अंतर्राष्ट्रीय संबंध सर्वाधिक महत्वपूर्ण।' },
  },
  {
    id: 'BPSC', short: 'BPSC',
    label: { en: 'BPSC (Bihar PCS)', hi: 'बीपीएससी (बिहार लोक सेवा)' },
    papers: ['GS Paper I', 'GS Paper II', 'Bihar Special', 'Prelims GS', 'Essay'],
    weights: W({ state: 1.7, schemes: 1.4, polity: 1.3, economy: 1.25, agriculture: 1.3, national: 1.15, environment: 1.1, reports: 1.15, days: 0.9 }),
    blurb: { en: 'Bihar-specific developments, schemes and agriculture carry outsized weight.', hi: 'बिहार से जुड़ी घटनाएँ, योजनाएँ एवं कृषि सर्वाधिक महत्वपूर्ण।' },
  },
  {
    id: 'STATE_PCS', short: 'PCS',
    label: { en: 'State PCS', hi: 'राज्य लोक सेवा आयोग' },
    papers: ['GS Paper I', 'GS Paper II', 'State Special', 'Prelims GS'],
    weights: W({ state: 1.6, schemes: 1.35, polity: 1.25, agriculture: 1.2, economy: 1.15, national: 1.1 }),
    blurb: { en: 'Your state\'s administration and schemes come before national analysis.', hi: 'अपने राज्य का प्रशासन एवं योजनाएँ राष्ट्रीय विश्लेषण से पहले।' },
  },
  {
    id: 'SSC', short: 'SSC',
    label: { en: 'SSC (CGL / CHSL / MTS)', hi: 'एसएससी (सीजीएल/सीएचएसएल)' },
    papers: ['General Awareness', 'Static GK'],
    weights: W({ awards: 1.5, appointments: 1.5, sports: 1.45, days: 1.45, schemes: 1.35, reports: 1.3, national: 1.1, polity: 1.0, international: 0.8, judiciary: 0.7 }),
    blurb: { en: 'Fact-dense one-liners: awards, appointments, sports, days, indices.', hi: 'तथ्य-आधारित वन-लाइनर: पुरस्कार, नियुक्तियाँ, खेल, दिवस, सूचकांक।' },
  },
  {
    id: 'BANKING', short: 'Bank',
    label: { en: 'Banking (IBPS / SBI / RBI)', hi: 'बैंकिंग (आईबीपीएस/एसबीआई/आरबीआई)' },
    papers: ['General Awareness', 'Banking Awareness', 'Financial Awareness'],
    weights: W({ economy: 1.9, reports: 1.35, appointments: 1.3, schemes: 1.25, awards: 1.1, national: 1.0, international: 0.95, environment: 0.6, defence: 0.5 }),
    blurb: { en: 'RBI actions, banking regulation and financial indices dominate.', hi: 'आरबीआई के निर्णय, बैंकिंग नियमन एवं वित्तीय सूचकांक प्रमुख।' },
  },
  {
    id: 'RAILWAY', short: 'RRB',
    label: { en: 'Railway (RRB NTPC / Group D)', hi: 'रेलवे (आरआरबी)' },
    papers: ['General Awareness', 'Static GK', 'Current Affairs'],
    weights: W({ awards: 1.4, sports: 1.4, appointments: 1.35, days: 1.35, scitech: 1.25, schemes: 1.2, national: 1.1, judiciary: 0.6 }),
    blurb: { en: 'Broad factual awareness with a science and infrastructure tilt.', hi: 'व्यापक तथ्यात्मक जागरूकता, विज्ञान एवं अवसंरचना पर ज़ोर।' },
  },
  {
    id: 'DEFENCE', short: 'CDS/NDA',
    label: { en: 'Defence (NDA / CDS / AFCAT)', hi: 'रक्षा (एनडीए/सीडीएस/एएफकैट)' },
    papers: ['General Knowledge', 'Current Affairs'],
    weights: W({ defence: 2.0, international: 1.4, scitech: 1.3, national: 1.15, sports: 1.1, awards: 1.0, economy: 0.8 }),
    blurb: { en: 'Military exercises, weapon systems and strategic affairs first.', hi: 'सैन्य अभ्यास, हथियार प्रणालियाँ एवं रणनीतिक मामले सर्वप्रथम।' },
  },
  {
    id: 'POLICE', short: 'Police',
    label: { en: 'Police / SI Exams', hi: 'पुलिस / दरोगा परीक्षा' },
    papers: ['General Knowledge', 'State GK', 'Current Affairs'],
    weights: W({ state: 1.5, polity: 1.35, judiciary: 1.3, national: 1.2, schemes: 1.15, defence: 1.1, sports: 1.0 }),
    blurb: { en: 'State law-and-order, polity and constitutional provisions.', hi: 'राज्य की विधि-व्यवस्था, राजव्यवस्था एवं संवैधानिक प्रावधान।' },
  },
  {
    id: 'TEACHING', short: 'TET',
    label: { en: 'Teaching (CTET / STET / KVS)', hi: 'शिक्षक भर्ती (सीटीईटी/एसटीईटी)' },
    papers: ['Child Development', 'General Awareness', 'Environmental Studies'],
    weights: W({ education: 2.0, environment: 1.35, schemes: 1.25, health: 1.2, national: 1.05, days: 1.1, defence: 0.5, economy: 0.7 }),
    blurb: { en: 'Education policy, NEP, and environment-linked pedagogy.', hi: 'शिक्षा नीति, एनईपी एवं पर्यावरण-आधारित शिक्षाशास्त्र।' },
  },
  {
    id: 'CUSTOM', short: 'Custom',
    label: { en: 'Other / Custom Exam', hi: 'अन्य / कस्टम परीक्षा' },
    papers: ['General Awareness'],
    weights: W({}),
    blurb: { en: 'Balanced ranking with no category boosted.', hi: 'संतुलित रैंकिंग, किसी श्रेणी को वरीयता नहीं।' },
  },
];

export const EXAM_MAP: Record<ExamId, ExamDef> =
  Object.fromEntries(EXAMS.map((e) => [e.id, e])) as Record<ExamId, ExamDef>;

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const STATES = [
  { slug: 'bihar', en: 'Bihar', hi: 'बिहार' },
  { slug: 'uttar-pradesh', en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
  { slug: 'madhya-pradesh', en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' },
  { slug: 'rajasthan', en: 'Rajasthan', hi: 'राजस्थान' },
  { slug: 'jharkhand', en: 'Jharkhand', hi: 'झारखंड' },
  { slug: 'west-bengal', en: 'West Bengal', hi: 'पश्चिम बंगाल' },
  { slug: 'maharashtra', en: 'Maharashtra', hi: 'महाराष्ट्र' },
  { slug: 'delhi', en: 'Delhi (NCT)', hi: 'दिल्ली' },
  { slug: 'haryana', en: 'Haryana', hi: 'हरियाणा' },
  { slug: 'punjab', en: 'Punjab', hi: 'पंजाब' },
  { slug: 'gujarat', en: 'Gujarat', hi: 'गुजरात' },
  { slug: 'karnataka', en: 'Karnataka', hi: 'कर्नाटक' },
  { slug: 'tamil-nadu', en: 'Tamil Nadu', hi: 'तमिलनाडु' },
  { slug: 'telangana', en: 'Telangana', hi: 'तेलंगाना' },
  { slug: 'andhra-pradesh', en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' },
  { slug: 'kerala', en: 'Kerala', hi: 'केरल' },
  { slug: 'odisha', en: 'Odisha', hi: 'ओडिशा' },
  { slug: 'assam', en: 'Assam', hi: 'असम' },
  { slug: 'chhattisgarh', en: 'Chhattisgarh', hi: 'छत्तीसगढ़' },
  { slug: 'uttarakhand', en: 'Uttarakhand', hi: 'उत्तराखंड' },
  { slug: 'himachal-pradesh', en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश' },
];

export const STATE_MAP = Object.fromEntries(STATES.map((s) => [s.slug, s]));

/** Terms that pin an article to a state. Bihar is deliberately detailed. */
export const STATE_HINTS: Record<string, string[]> = {
  bihar: ['bihar', 'patna', 'nitish kumar', 'bihar government', 'muzaffarpur', 'gaya', 'bhagalpur',
    'darbhanga', 'bettiah', 'motihari', 'chhapra', 'purnia', 'nalanda', 'rohtas', 'begusarai',
    'west champaran', 'east champaran', 'saran', 'vaishali', 'madhubani', 'samastipur', 'katihar',
    'kosi', 'gandak', 'sone canal', 'bihar assembly', 'raj bhavan patna', 'bpsc', 'bihar cabinet'],
  'uttar-pradesh': ['uttar pradesh', 'lucknow', 'yogi adityanath', 'varanasi', 'prayagraj', 'kanpur', 'noida', 'ayodhya'],
  'madhya-pradesh': ['madhya pradesh', 'bhopal', 'indore', 'jabalpur', 'gwalior'],
  rajasthan: ['rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'kota'],
  jharkhand: ['jharkhand', 'ranchi', 'jamshedpur', 'dhanbad'],
  'west-bengal': ['west bengal', 'kolkata', 'mamata banerjee', 'darjeeling'],
  maharashtra: ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik'],
  delhi: ['delhi government', 'new delhi municipal', 'nct of delhi'],
  haryana: ['haryana', 'gurugram', 'chandigarh haryana', 'faridabad'],
  punjab: ['punjab', 'amritsar', 'ludhiana', 'jalandhar'],
  gujarat: ['gujarat', 'ahmedabad', 'surat', 'gandhinagar', 'vadodara'],
  karnataka: ['karnataka', 'bengaluru', 'mysuru', 'mangaluru'],
  'tamil-nadu': ['tamil nadu', 'chennai', 'madurai', 'coimbatore'],
  telangana: ['telangana', 'hyderabad', 'warangal'],
  'andhra-pradesh': ['andhra pradesh', 'amaravati', 'visakhapatnam', 'vijayawada'],
  kerala: ['kerala', 'thiruvananthapuram', 'kochi', 'kozhikode'],
  odisha: ['odisha', 'bhubaneswar', 'cuttack', 'puri'],
  assam: ['assam', 'guwahati', 'dispur', 'brahmaputra valley'],
  chhattisgarh: ['chhattisgarh', 'raipur', 'bastar'],
  uttarakhand: ['uttarakhand', 'dehradun', 'nainital', 'haridwar'],
  'himachal-pradesh': ['himachal pradesh', 'shimla', 'manali', 'dharamshala'],
};

/** Spaced-repetition ladder in days. */
export const SRS_LADDER = [1, 3, 7, 15, 30];
