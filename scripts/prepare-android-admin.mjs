import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'www');
const excluded = new Set([
  '.git', '.github', '.agent', 'node_modules', 'android', 'www',
  'Obsidian Vault', 'Obsidian Vault.zip', 'supabase', 'sql', 'docs',
  'LORGUS_CHECKLIST.md', 'package-lock.json'
]);

await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });

async function copyTree(from, to, topLevel = false) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (topLevel && excluded.has(entry.name)) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyTree(source, target, false);
    } else if (entry.isFile()) {
      await fs.copyFile(source, target);
    }
  }
}

await copyTree(root, out, true);
await fs.copyFile(path.join(root, 'admin.html'), path.join(out, 'index.html'));
console.log('Prepared bundled LORGUS admin UI in www/index.html');
