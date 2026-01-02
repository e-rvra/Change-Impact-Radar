import fs from "fs";
import path from "path";
import * as core from "@actions/core";
import { parsePythonImports, parseJsImports } from "./parsers";
import { safeRel } from "./util";

export class DepGraph {
  nodes: Set<string>;
  // edges: file -> imported file(s)
  edges: Map<string, Set<string>>;
  // reverse edges: file -> dependents
  rev: Map<string, Set<string>>;

  constructor() {
    this.nodes = new Set();
    this.edges = new Map();
    this.rev = new Map();
  }

  addNode(n: string) {
    this.nodes.add(n);
    if (!this.edges.has(n)) this.edges.set(n, new Set());
    if (!this.rev.has(n)) this.rev.set(n, new Set());
  }

  addEdge(from: string, to: string) {
    this.addNode(from);
    this.addNode(to);
    this.edges.get(from)!.add(to);
    this.rev.get(to)!.add(from);
  }

  outNeighbors(n: string): string[] {
    return Array.from(this.edges.get(n) ?? []);
  }

  inNeighbors(n: string): string[] {
    return Array.from(this.rev.get(n) ?? []);
  }

  degree(n: string): number {
    return (this.edges.get(n)?.size ?? 0) + (this.rev.get(n)?.size ?? 0);
  }

  edgeCount(): number {
    let c = 0;
    for (const s of this.edges.values()) c += s.size;
    return c;
  }
}

export type GraphBuildResult = {
  graph: DepGraph;
  stats: { parsedFiles: number; externalImports: number; unresolvedImports: number };
};

export function buildDependencyGraph(opts: {
  repoFiles: string[];
  primary: "python" | "js_ts" | "unknown";
  maxFiles: number;
  debug: boolean;
}): GraphBuildResult {
  const cwd = process.cwd();
  const g = new DepGraph();
  const stats = { parsedFiles: 0, externalImports: 0, unresolvedImports: 0 };

  // index for quick resolution
  const fileSet = new Set(opts.repoFiles.map(safeRel));
  const pyModuleIndex = buildPythonModuleIndex(fileSet);
  const jsPathIndex = fileSet; // already path-based

  for (const rel of fileSet) g.addNode(rel);

  for (const rel of fileSet) {
    const full = path.join(cwd, rel);
    let content = "";
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    stats.parsedFiles++;

    const lower = rel.toLowerCase();
    if (lower.endsWith(".py")) {
      const imports = parsePythonImports(content);
      for (const imp of imports) {
        const resolved = resolvePythonImport(rel, imp, pyModuleIndex);
        if (resolved === null) {
          // If it's clearly external (no matching module), count as external
          if (isProbablyExternalPython(imp)) stats.externalImports++;
          else stats.unresolvedImports++;
          continue;
        }
        g.addEdge(rel, resolved);
      }
    } else {
      const imports = parseJsImports(content);
      for (const imp of imports) {
        const resolved = resolveJsImport(rel, imp, jsPathIndex);
        if (resolved === null) {
          if (isProbablyExternalJs(imp)) stats.externalImports++;
          else stats.unresolvedImports++;
          continue;
        }
        g.addEdge(rel, resolved);
      }
    }
  }

  if (opts.debug) {
    core.info(`Graph build: parsedFiles=${stats.parsedFiles} external=${stats.externalImports} unresolved=${stats.unresolvedImports}`);
  }

  return { graph: g, stats };
}

function buildPythonModuleIndex(files: Set<string>): Map<string, string> {
  // Map module name -> file path, best-effort:
  // a/b.py -> a.b ; a/b/__init__.py -> a.b
  const idx = new Map<string, string>();
  for (const f of files) {
    const lower = f.toLowerCase();
    if (!lower.endsWith(".py")) continue;
    const noExt = f.replace(/\.py$/i, "");
    const parts = noExt.split("/");

    if (parts[parts.length - 1] === "__init__") {
      parts.pop();
    }
    const mod = parts.filter(Boolean).join(".");
    if (mod) idx.set(mod, f);
  }
  return idx;
}

function resolvePythonImport(fromFile: string, imp: string, idx: Map<string, string>): string | null {
  // Handle relative imports: ".foo", "..bar.baz"
  if (imp.startsWith(".")) {
    const m = imp.match(/^(\.+)(.*)$/);
    if (!m) return null;
    const dots = m[1].length;
    const rest = m[2] || "";
    const fromDir = path.posix.dirname(fromFile);
    const up = fromDir.split("/").slice(0, Math.max(0, fromDir.split("/").length - (dots - 1))).join("/");
    // rest is module path under that
    const asPath = rest ? rest.replace(/\./g, "/") : "";
    const cand1 = safeRel(path.posix.join(up, asPath + ".py"));
    const cand2 = safeRel(path.posix.join(up, asPath, "__init__.py"));
    if (idxHasFile(idx, cand1)) return cand1;
    if (idxHasFile(idx, cand2)) return cand2;
    return null;
  }

  // Absolute import -> module index lookup (prefer exact), else try progressively shorter
  if (idx.has(imp)) return idx.get(imp)!;

  // Try "a.b.c" as "a/b/c.py" etc (some repos might not be packages)
  const pathCand1 = safeRel(imp.replace(/\./g, "/") + ".py");
  const pathCand2 = safeRel(imp.replace(/\./g, "/") + "/__init__.py");
  if (idxHasFile(idx, pathCand1)) return pathCand1;
  if (idxHasFile(idx, pathCand2)) return pathCand2;

  // Try prefix modules (import x.y.z might map to x/y/__init__.py)
  const parts = imp.split(".");
  for (let k = parts.length - 1; k >= 1; k--) {
    const prefix = parts.slice(0, k).join(".");
    if (idx.has(prefix)) return idx.get(prefix)!;
  }

  return null;
}

function idxHasFile(idx: Map<string, string>, rel: string): boolean {
  // idx values are files; check by scanning values is costly; instead, compare against possible direct values
  // We'll accept a small O(n) in v1? Better: build a fileSet. For v1, keep simple via a cached set.
  // But we don't have it here; so fallback to "any value equals rel"
  for (const v of idx.values()) if (v === rel) return true;
  return false;
}

function isProbablyExternalPython(imp: string): boolean {
  // If it's "pkg" or "pkg.sub", could be external; we can't know. Treat non-relative as external by default.
  return !imp.startsWith(".");
}

function resolveJsImport(fromFile: string, spec: string, fileSet: Set<string>): string | null {
  // Only resolve relative and repo-local absolute-ish ("./", "../", "/src/..")
  const fromDir = path.posix.dirname(fromFile);

  if (spec.startsWith(".") || spec.startsWith("/")) {
    const base = spec.startsWith("/") ? spec.slice(1) : safeRel(path.posix.join(fromDir, spec));
    const candidates = jsCandidates(base);
    for (const c of candidates) {
      if (fileSet.has(c)) return c;
    }
    return null;
  }

  // bare imports are treated as external (react, lodash, etc.)
  return null;
}

function jsCandidates(base: string): string[] {
  // emulate Node-ish resolution (best-effort)
  const b = base.replace(/\\/g, "/");
  const out: string[] = [];
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(b)) {
    out.push(b);
    return out;
  }
  out.push(b + ".ts", b + ".tsx", b + ".js", b + ".jsx", b + ".mjs", b + ".cjs");
  out.push(path.posix.join(b, "index.ts"));
  out.push(path.posix.join(b, "index.tsx"));
  out.push(path.posix.join(b, "index.js"));
  out.push(path.posix.join(b, "index.jsx"));
  out.push(path.posix.join(b, "index.mjs"));
  out.push(path.posix.join(b, "index.cjs"));
  return out.map(safeRel);
}

function isProbablyExternalJs(spec: string): boolean {
  return !(spec.startsWith(".") || spec.startsWith("/"));
}
