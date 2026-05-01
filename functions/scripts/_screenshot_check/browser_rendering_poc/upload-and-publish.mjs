/**
 * PoC のスクショを Firebase Storage に上げて公開 URL を発行する。
 *
 * 使い方 (functions/ ディレクトリから実行):
 *   node scripts/_screenshot_check/browser_rendering_poc/upload-and-publish.mjs
 *
 * 前提: ローカルで Firebase 認証済 (firebase login) または ADC 設定済。
 * 出力: poc/browser_rendering/<filename> として Storage にアップ → makePublic → URL を表示。
 */
import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'growgroupreporter';
const STORAGE_BUCKET = 'growgroupreporter.firebasestorage.app';
const STORAGE_PREFIX = 'poc/browser_rendering';

admin.initializeApp({
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bucket = admin.storage().bucket();

const targets = fs
  .readdirSync(__dirname)
  .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  .sort();

if (targets.length === 0) {
  console.warn('No image files to upload.');
  process.exit(0);
}

console.log(`Uploading ${targets.length} file(s) to gs://${STORAGE_BUCKET}/${STORAGE_PREFIX}/`);

const results = [];
for (const filename of targets) {
  const localPath = path.join(__dirname, filename);
  const remotePath = `${STORAGE_PREFIX}/${filename}`;
  try {
    await bucket.upload(localPath, {
      destination: remotePath,
      metadata: {
        contentType: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        cacheControl: 'public, max-age=300',
      },
      resumable: false,
    });
    await bucket.file(remotePath).makePublic();
    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${remotePath}`;
    results.push({ filename, publicUrl });
    console.log(`  ✓ ${filename} -> ${publicUrl}`);
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.message}`);
  }
}

console.log('\n=== Public URLs ===');
for (const r of results) {
  console.log(`${r.filename}: ${r.publicUrl}`);
}
