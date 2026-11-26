import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SCAN_ROOT = path.resolve('apps/client/dist');
const FORBIDDEN_PATTERNS = [
  { name: 'Supabase service role key', pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
  { name: 'database URL', pattern: /postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i },
  { name: 'JWT signing secret', pattern: /SUPABASE_JWT_SECRET|DEV_JWT_SECRET/ },
  { name: 'private key block', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

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

let failures = 0;
const files = await listFiles(SCAN_ROOT);
for (const file of files) {
  const contents = await readFile(file, 'utf8');
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(contents)) {
      console.error(`[secret-scan] ${rule.name} found in ${path.relative(SCAN_ROOT, file)}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`Secret scan failed with ${failures} finding(s).`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} file(s) scanned).`);
