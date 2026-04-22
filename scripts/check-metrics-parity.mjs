#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SRC = resolve(ROOT, 'shared/metrics.json');
const GENERATED = [
  resolve(ROOT, 'functions/src/constants/metrics.generated.json'),
  resolve(ROOT, 'functions-python/shared/metrics.generated.json'),
];

const src = readFileSync(SRC, 'utf8');
let ok = true;

for (const target of GENERATED) {
  if (!existsSync(target)) {
    console.error(`missing: ${target}. Run: node scripts/sync-metrics.mjs`);
    ok = false;
    continue;
  }
  const gen = readFileSync(target, 'utf8');
  if (gen !== src) {
    console.error(`drift: ${target} differs from SSoT. Run: node scripts/sync-metrics.mjs`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('metrics parity OK');
