#!/usr/bin/env node
// Keep the repository (and the PWA cache) from growing without bound. Anything
// older than the retention window is dropped; a student revising 4-month-old
// news is revising the wrong thing anyway.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DAY_DIR = path.join(ROOT, 'public', 'data', 'day');
const RETAIN_DAYS = Number(process.env.RETAIN_DAYS || 120);

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - RETAIN_DAYS);
const cutoffIso = cutoff.toISOString().slice(0, 10);

const files = (await fs.readdir(DAY_DIR).catch(() => [])).filter((f) => f.endsWith('.json'));
let removed = 0;
for (const f of files) {
  if (f.replace('.json', '') < cutoffIso) {
    await fs.unlink(path.join(DAY_DIR, f));
    removed++;
  }
}
console.log(removed ? `Pruned ${removed} day file(s) older than ${cutoffIso}.` : 'Nothing to prune.');
