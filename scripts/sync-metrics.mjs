#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SRC = resolve(ROOT, 'shared/metrics.json');
const TARGETS = [
  resolve(ROOT, 'functions/src/constants/metrics.generated.json'),
  resolve(ROOT, 'functions-python/shared/metrics.generated.json'),
];

const content = readFileSync(SRC, 'utf8');
JSON.parse(content);

for (const target of TARGETS) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`synced -> ${target}`);
}
