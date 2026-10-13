import { existsSync, readFileSync } from "node:fs";
import { resolve, relative, isAbsolute, extname } from "node:path";

const root = process.cwd();
const htmlPath = resolve(root, "index.html");
const html = readFileSync(htmlPath, "utf8");
const failures = [];
const references = [];

function checkReference(raw, source) {
  const value = raw.trim();
  if (!value || value.startsWith("#") || value.startsWith("data:") ||
      value.startsWith("blob:") || value.startsWith("//") ||
      /^[a-z][a-z0-9+.-]*:/i.test(value)) return;

  const pathname = value.split(/[?#]/, 1)[0];
  if (!pathname) return;
  const target = resolve(root, pathname.replace(/^\/+/, ""));
  const rel = relative(root, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    failures.push(`${source}: path escapes repository root: ${value}`);
    return;
  }
  references.push({ source, value, target });
  if (!existsSync(target)) failures.push(`${source}: missing local asset ${value}`);
}

for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
  const tag = match[0];
  const attr = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag) ??
               /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
  if (attr) checkReference(attr[1], "index.html");
}

const cssFiles = references
  .filter(ref => extname(ref.target).toLowerCase() === ".css" && existsSync(ref.target))
  .map(ref => ref.target);

for (const cssPath of [...new Set(cssFiles)]) {
  const css = readFileSync(cssPath, "utf8");
  for (const match of css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"]+))\s*\)/gi)) {
    const raw = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("data:") ||
        raw.startsWith("blob:") || raw.startsWith("//") ||
        /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const pathname = raw.split(/[?#]/, 1)[0];
    const target = pathname.startsWith("/")
      ? resolve(root, pathname.replace(/^\/+/, ""))
      : resolve(cssPath, "..", pathname);
    const rel = relative(root, target);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      failures.push(`${relative(root, cssPath)}: path escapes repository root: ${raw}`);
    } else if (!existsSync(target)) {
      failures.push(`${relative(root, cssPath)}: missing CSS asset ${raw}`);
    }
  }
}

if (failures.length) {
  console.error("Runtime asset check failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Runtime asset check passed: ${references.length} local script/style references found in index.html.`);
