export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function parseCsv(s: string): string[] {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function toBool(s: string): boolean {
  return (s || "").trim().toLowerCase() === "true";
}

export function safeRel(pathLike: string): string {
  return pathLike.replace(/\\/g, "/");
}

export function isCodeFile(p: string): boolean {
  const x = p.toLowerCase();
  return x.endsWith(".py") || x.endsWith(".js") || x.endsWith(".ts") || x.endsWith(".tsx") || x.endsWith(".jsx") || x.endsWith(".mjs") || x.endsWith(".cjs");
}

export function pickTop<T>(arr: T[], n: number, score: (x: T) => number): T[] {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}
