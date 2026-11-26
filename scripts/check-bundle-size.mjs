import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const CLIENT_DIST = path.resolve('apps/client/dist');
const BUDGET_GZIP_BYTES = 6 * 1024 * 1024;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

try {
  const info = await stat(CLIENT_DIST);
  if (!info.isDirectory()) {
    throw new Error(`${CLIENT_DIST} is not a directory`);
  }
} catch {
  console.error('Client build output not found. Run "pnpm build" first.');
  process.exit(1);
}

const files = await listFiles(CLIENT_DIST);
let total = 0;
const rows = [];
for (const file of files) {
  const contents = await readFile(file);
  const gzipBytes = gzipSync(contents, { level: 9 }).byteLength;
  total += gzipBytes;
  rows.push({ file: path.relative(CLIENT_DIST, file), gzipBytes });
}

rows.sort((a, b) => b.gzipBytes - a.gzipBytes);
for (const row of rows) {
  console.log(`${String(row.gzipBytes).padStart(10)} B  ${row.file}`);
}
console.log(`\nTotal gzip: ${total} B (budget ${BUDGET_GZIP_BYTES} B)`);

if (total > BUDGET_GZIP_BYTES) {
  console.error('Bundle size budget exceeded.');
  process.exit(1);
}
