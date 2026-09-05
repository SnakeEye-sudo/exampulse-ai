# ExamPulse AI

**Current affairs, turned into marks.**

A daily current-affairs intelligence and revision platform for Indian government-exam
aspirants — UPSC, BPSC, State PCS, SSC, Banking, Railway, Defence, Police and Teaching.

It is deliberately **not** a news website. Every story it keeps is put through the same
eight questions:

1. What happened?
2. Why is it important?
3. Why can it matter in an examination?
4. Which syllabus topics does it connect to?
5. What static GK should be revised alongside it?
6. Which exams is it relevant to?
7. What questions can be built from it?
8. When should it be revised again?

---

## How it stays current without anyone touching it

```
GitHub Actions  ·  06:15 IST daily
   │
   ├─ 1. fetch      27 RSS feeds (PIB, The Hindu, Indian Express, Mint,
   │                BusinessLine, plus targeted topic queries)
   ├─ 2. hydrate    PIB releases are fetched in full from the release page
   ├─ 3. classify   deterministic keyword + state pre-classification
   ├─ 4. dedupe     token, containment and rare-entity matching; duplicates
   │                across outlets become corroborating sources, not deletions
   ├─ 5. rank       exam-signal scoring, noise suppression, per-source caps
   ├─ 6. enrich     Gemini → relevance score, syllabus map, static GK,
   │                organisations, terminology, PYQ pattern, MCQs, Hindi
   └─ 7. write      JSON committed to this repo → Vercel redeploys itself
```

There is no database and no backend to operate. **The repository is the database.**
Static JSON is fast, versioned, diffable, free to host, and cacheable by the service
worker — which means the whole app works offline.

User progress (quiz attempts, mistake book, revision schedule, streak) lives in
`localStorage` on the student's own device. No account, no server, nothing collected.
The trade-off is that progress does not sync across devices, so Settings has
export/import.

---

## Source integrity

This is a study tool. A wrong "fact" memorised from it costs someone real marks, so
provenance is enforced rather than decorative:

| Status | Meaning |
|---|---|
| **Primary** | The body itself published it (PIB, ministries, regulators). |
| **Verified** | An established newsroom with an editorial process, or an aggregated headline independently carried by a second outlet. |
| **Unverified** | A single unconfirmed report. Shown with a visible warning and capped at 4★. |

Social reposts, forums and coaching content farms are rejected at ingestion
(`scripts/publishers.mjs`) and never reach the app.

**Current facts** may only come from the linked source text. **Static background**
(constitutional articles, when a body was founded, what a term means) may come from
settled reference knowledge and is presented in its own section. Conflating the two is
the failure mode the whole enrichment prompt is written to prevent. Items where
enrichment fails are stored in a degraded, headline-only form and labelled as such
rather than being padded out.

---

## Running locally

```bash
npm install
npm run dev                       # http://localhost:3000
```

To fetch and enrich a day of real news:

```bash
GEMINI_API_KEY=... node --experimental-strip-types --no-warnings scripts/pipeline.mjs
```

Useful environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Required for enrichment and the AI tutor. Without it, articles are stored headline-only. |
| `GEMINI_MODEL` | auto | Pins a model. Otherwise a fallback chain is walked, so a retired model does not break the daily job. |
| `PIPELINE_LIMIT` | `40` | Articles enriched per run. |
| `PIPELINE_DATE` | today (IST) | Backfill a specific date. |
| `RETAIN_DAYS` | `120` | Archive retention. |

---

## Deployment

Vercel is linked to this repository's default branch. Every data commit from the daily
workflow triggers a redeploy, so the live site is never more than a few minutes behind
the ingestion run.

Two secrets are needed:

- **GitHub → Settings → Secrets → Actions → `GEMINI_API_KEY`** — used by the daily job.
- **Vercel → Project → Settings → Environment Variables → `GEMINI_API_KEY`** — used by
  the `/api/ask` tutor route at runtime. Without it, every other feature still works and
  the tutor returns a clear "not configured" message.

---

## Project layout

```
scripts/
  sources.mjs      feed registry with trust tiers
  publishers.mjs   aggregator publisher allow/deny list
  fetch-feeds.mjs  fetching, RSS/Atom parsing, PIB hydration
  rank.mjs         classification, dedupe, exam-signal scoring
  enrich.mjs       Gemini contract, schema, model fallback chain
  pipeline.mjs     orchestration + derived file generation
  prune.mjs        archive retention

src/lib/
  types.ts         domain model
  taxonomy.ts      categories, exams and their weightings, states, SRS ladder
  store.ts         local-first user state, SRS, Wilson-bound weakness analysis
  data.ts          data loading + per-user personalised ranking
  advice.ts        the on-device "what should I study today?" recommendation
  i18n.ts          bilingual UI strings

public/data/
  manifest.json    dates, months, corpus counts, source breakdown
  index.json       lightweight records for search and filtering
  day/*.json       full articles per day
  monthly/*.json   compiled revision magazine per month
```

---

## Known limits

- Progress is per-browser. Switching device means exporting and importing.
- The archive only holds days since the pipeline started running. Search cannot find
  older topics because they were never ingested.
- The free Gemini tier is rate-limited; a heavy day may leave a few articles in
  degraded form. They are labelled, not hidden.
- PYQ connections describe the *pattern* of how a topic has been tested. They are not a
  verified previous-year question database.
