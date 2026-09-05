// ---------------------------------------------------------------------------
// Aggregator feeds hand us a publisher name, not a publisher we chose. This is
// the gate: a headline is only as trustworthy as who printed it, and a study
// app that grades an Instagram repost as "verified" is teaching wrong habits.
// ---------------------------------------------------------------------------

/** Publishers with a real newsroom. An aggregator item from these is promoted. */
const RECOGNISED = [
  'the hindu', 'indian express', 'hindustan times', 'times of india', 'the times of india',
  'mint', 'livemint', 'business standard', 'businessline', 'economic times', 'the economic times',
  'ndtv', 'india today', 'news18', 'firstpost', 'the print', 'theprint', 'the wire', 'scroll.in',
  'deccan herald', 'the telegraph', 'telegraph india', 'the tribune', 'tribuneindia',
  'the new indian express', 'moneycontrol', 'financial express', 'outlook', 'frontline',
  'down to earth', 'mongabay', 'the hindu businessline', 'dd news', 'doordarshan', 'prasar bharati',
  'all india radio', 'akashvani', 'pib', 'press information bureau', 'pti', 'press trust of india',
  'ani', 'ians', 'reuters', 'bbc', 'associated press', 'the guardian', 'al jazeera',
  'united nations', 'un news', 'world bank', 'imf', 'who', 'nasa', 'isro',
  'dainik jagran', 'dainik bhaskar', 'amar ujala', 'navbharat times', 'jagran josh',
  'prabhat khabar', 'hindustan', 'live hindustan', 'aaj tak', 'zee news', 'abp',
  'rajya sabha tv', 'sansad tv', 'the quint', 'newslaundry', 'the federal', 'onmanorama',
];

/** Sources that are reposts, forums or content farms — dropped outright. */
const REJECTED = [
  'instagram', 'facebook', 'youtube', 'x.com', 'twitter', 'reddit', 'quora', 'pinterest',
  'telegram', 'whatsapp', 'linkedin', 'tiktok', 'threads',
  'blogspot', 'wordpress.com', 'medium.com', 'substack', 'tumblr',
  'testbook', 'adda247', 'gradeup', 'byjus', 'unacademy', 'vedantu', 'careerpower',
  'jagranjosh.com/current', 'examsdaily', 'sarkariresult', 'freejobalert', 'affairscloud',
  'wikipedia', 'wikiwand', 'answers.com', 'slideshare', 'scribd',
];

const norm = (s) => String(s || '').toLowerCase().trim();

export function publisherVerdict(publisher) {
  const p = norm(publisher);
  if (!p) return { verdict: 'unknown', recognised: false };
  if (REJECTED.some((r) => p.includes(r))) return { verdict: 'reject', recognised: false };
  if (RECOGNISED.some((r) => p.includes(r))) return { verdict: 'accept', recognised: true };
  // A bare domain with no editorial identity we know of: keep it, but it stays
  // unverified and cannot be promoted by corroboration alone.
  return { verdict: 'weak', recognised: false };
}
