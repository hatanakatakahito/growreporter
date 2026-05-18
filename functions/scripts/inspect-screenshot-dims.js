// pageScreenshots に保存されている各 URL のスクショ寸法と先頭部分を確認
import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

const siteId = process.argv[2];
if (!siteId) {
  console.error('Usage: node scripts/inspect-screenshot-dims.js <siteId>');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});
const db = admin.firestore();

function readJpegSize(buffer) {
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) return null;
    const marker = buffer[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buffer.readUInt16BE(i + 5);
      const w = buffer.readUInt16BE(i + 7);
      return { width: w, height: h };
    }
    const segLen = buffer.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  return null;
}

const snap = await db.collection(`sites/${siteId}/pageScreenshots`).get();
const rows = [];
for (const d of snap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (!data.screenshotUrl) continue;
  try {
    const res = await fetch(data.screenshotUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const dim = readJpegSize(buf);
    rows.push({
      url: data.url,
      type: data.screenshotType,
      width: dim?.width,
      height: dim?.height,
      ratio: dim ? (dim.height / dim.width).toFixed(2) : null,
      bytes: buf.length,
      bytesPerKpx: dim ? ((buf.length / (dim.width * dim.height)) * 1000).toFixed(2) : null,
      capturedAt: data.capturedAt?.toDate?.()?.toISOString()?.substring(0, 19),
    });
  } catch (e) {
    console.warn('fetch failed', data.url, e.message);
  }
}
rows.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
console.log(`siteId: ${siteId}`);
console.log('URL                                                             | type      | width × height | 比 | bytes | B/Kpx');
console.log('-'.repeat(140));
for (const r of rows) {
  console.log(
    `${(r.url || '').padEnd(60).substring(0, 60)} | ${(r.type || '?').padEnd(9)} | ${String(r.width || '?').padStart(5)} × ${String(r.height || '?').padStart(5)} | ${(r.ratio || '?').padStart(4)} | ${String(r.bytes).padStart(6)} | ${(r.bytesPerKpx || '?').padStart(5)}`
  );
}
