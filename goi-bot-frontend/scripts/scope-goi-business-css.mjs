import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PREFIX = ".goi-biz";
const src = "C:/Users/DELL/Downloads/goi-business-reference/reference-site/app/globals.css";
const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/goi-business.css");

function extractBlock(css, braceIndex) {
  let depth = 0;
  for (let i = braceIndex; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return { inner: css.slice(braceIndex + 1, i), end: i + 1 };
    }
  }
  throw new Error("Unbalanced CSS braces");
}

function prefixSelectors(raw) {
  return raw
    .split(",")
    .map((part) => {
      const s = part.trim();
      if (!s) return s;
      if (s.startsWith("@")) return s;
      let sel = s
        .replace(/(^|[\s>+~,(])body\b/g, `$1${PREFIX}`)
        .replace(/(^|[\s>+~,(])html\b/g, `$1${PREFIX}`)
        .replace(/:root\b/g, PREFIX);
      if (sel === PREFIX || sel.startsWith(`${PREFIX} `) || sel.startsWith(`${PREFIX}:`) || sel.startsWith(`${PREFIX}[`) || sel.startsWith(`${PREFIX}.`)) {
        return sel;
      }
      if (sel.startsWith(":")) return `${PREFIX}${sel}`;
      return `${PREFIX} ${sel}`;
    })
    .filter(Boolean)
    .join(",");
}

function walk(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      out += css.slice(i, end === -1 ? css.length : end + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    while (i < css.length && /\s/.test(css[i])) {
      out += css[i];
      i++;
    }
    if (i >= css.length) break;
    if (css[i] === "@") {
      const brace = css.indexOf("{", i);
      if (brace === -1) {
        out += css.slice(i);
        break;
      }
      const header = css.slice(i, brace);
      const { inner, end } = extractBlock(css, brace);
      if (/^@(media|supports|layer)\b/.test(header.trim())) {
        out += header + "{" + walk(inner) + "}";
      } else {
        out += header + "{" + inner + "}";
      }
      i = end;
      continue;
    }
    const brace = css.indexOf("{", i);
    if (brace === -1) {
      out += css.slice(i);
      break;
    }
    const selectors = css.slice(i, brace);
    const { inner, end } = extractBlock(css, brace);
    out += prefixSelectors(selectors) + "{" + inner + "}";
    i = end;
  }
  return out;
}

const raw = readFileSync(src, "utf8");
const start = raw.indexOf(":root{color-scheme:light;");
if (start < 0) throw new Error("Could not find compacted GOI CSS");
const scoped = walk(raw.slice(start));

const header = `/* Scoped GOI business-panel design. Generated from the local reference.
   Do not import this file outside BusinessShell. */\n`;
const extra = `
${PREFIX} {
  font-family: Arial, Helvetica, sans-serif;
  background: #f4f6f7;
  color: #1b302a;
  min-height: 100dvh;
}
${PREFIX} *, ${PREFIX} *::before, ${PREFIX} *::after { box-sizing: border-box; }
${PREFIX} a { color: inherit; text-decoration: none; }
${PREFIX} button { background: none; border: 0; color: inherit; }
${PREFIX} .app-shell { display: flex; min-height: 100dvh; background: #f4f6f7; }
${PREFIX} .app-sidebar {
  width: 248px;
  flex-shrink: 0;
  background: #102c24;
  color: #d7e4dd;
  display: flex;
  flex-direction: column;
}
${PREFIX} .app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 100dvh; }
${PREFIX} .page-scroll { flex: 1; min-height: 0; overflow: auto; }
${PREFIX} .sidebar-overlay { display: none; }
@media (max-width: 767px) {
  ${PREFIX} .app-shell { display: block; }
  ${PREFIX} .app-sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: 50;
    transform: translateX(110%);
    transition: transform .2s ease;
    max-width: min(248px, 88vw);
  }
  ${PREFIX}[dir="rtl"] .app-sidebar { transform: translateX(-110%); }
  ${PREFIX} .app-sidebar.is-open { transform: translateX(0); }
  ${PREFIX} .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: #102c2473;
  }
  ${PREFIX} .app-main { min-height: 100dvh; }
}
`;

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, header + extra + scoped, "utf8");
console.log("Wrote", dest, "bytes", (header + extra + scoped).length);
