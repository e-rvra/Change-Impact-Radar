// Pure string parsing (safe). No execution.

export type ImportRef = {
  raw: string;
  kind: "python" | "js";
};

const PY_IMPORT_RE = /^\s*import\s+([a-zA-Z0-9_\.]+)\s*(?:#.*)?$/gm;
const PY_FROM_IMPORT_RE = /^\s*from\s+([a-zA-Z0-9_\.]+)\s+import\s+([a-zA-Z0-9_\.\*,\s]+)\s*(?:#.*)?$/gm;
const PY_REL_FROM_RE = /^\s*from\s+(\.+)([a-zA-Z0-9_\.]*)\s+import\s+([a-zA-Z0-9_\.\*,\s]+)\s*(?:#.*)?$/gm;

const JS_IMPORT_RE = /^\s*import(?:[\s\w\{\}\*\$,]*from\s*)?["']([^"']+)["']\s*;?/gm;
const JS_EXPORT_FROM_RE = /^\s*export\s+.*\s+from\s+["']([^"']+)["']\s*;?/gm;
const JS_REQUIRE_RE = /^\s*(?:const|let|var)\s+[\w\{\}\s,\$]*=\s*require\(\s*["']([^"']+)["']\s*\)\s*;?/gm;

export function parsePythonImports(content: string): string[] {
  const out: string[] = [];

  for (const m of content.matchAll(PY_IMPORT_RE)) out.push(m[1]);

  for (const m of content.matchAll(PY_FROM_IMPORT_RE)) {
    out.push(m[1]);
  }

  // Preserve relative prefix "....pkg" as a special token
  for (const m of content.matchAll(PY_REL_FROM_RE)) {
    const dots = m[1] || ".";
    const rest = m[2] || "";
    out.push(`${dots}${rest}`);
  }

  return uniq(out);
}

export function parseJsImports(content: string): string[] {
  const out: string[] = [];
  for (const m of content.matchAll(JS_IMPORT_RE)) out.push(m[1]);
  for (const m of content.matchAll(JS_EXPORT_FROM_RE)) out.push(m[1]);
  for (const m of content.matchAll(JS_REQUIRE_RE)) out.push(m[1]);
  return uniq(out);
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
}
