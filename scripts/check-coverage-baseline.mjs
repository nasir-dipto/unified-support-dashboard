#!/usr/bin/env node
/**
 * Prints coverage baseline warnings when summaries are below target thresholds (exit 0).
 */
import { readFileSync } from 'node:fs';

const TARGETS = {
  lines: 60,
  functions: 60,
  branches: 50,
};

const files = process.argv.slice(2);
if (files.length === 0) {
  console.warn('check-coverage-baseline: no coverage-summary.json paths provided');
  process.exit(0);
}

for (const file of files) {
  let summary;
  try {
    summary = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`check-coverage-baseline: could not read ${file}: ${String(err)}`);
    continue;
  }
  const total = summary.total;
  if (total === undefined) {
    console.warn(`check-coverage-baseline: missing total in ${file}`);
    continue;
  }
  console.info(`\nCoverage baseline check: ${file}`);
  for (const [metric, target] of Object.entries(TARGETS)) {
    const pct = total[metric]?.pct;
    if (typeof pct !== 'number') {
      continue;
    }
    if (pct < target) {
      console.warn(
        `  WARN: ${metric} ${pct.toFixed(2)}% is below target ${String(target)}% (not blocking CI)`,
      );
    } else {
      console.info(`  OK: ${metric} ${pct.toFixed(2)}% (target ${String(target)}%)`);
    }
  }
}
