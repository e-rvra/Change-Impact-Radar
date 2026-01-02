import * as core from "@actions/core";
import fg from "fast-glob";
import path from "path";
import { PullFile } from "./github";

export type LangGuess = {
  primary: "python" | "js_ts" | "unknown";
  pyCount: number;
  jsCount: number;
  tsCount: number;
};

export function detectPrimaryLanguages(files: PullFile[]): LangGuess {
  let py = 0,
    js = 0,
    ts = 0;
  for (const f of files) {
    const ext = f.filename.toLowerCase().split(".").pop() || "";
    if (ext === "py") py++;
    if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") js++;
    if (ext === "ts" || ext === "tsx") ts++;
  }
  const totalJsTs = js + ts;
  let primary: LangGuess["primary"] = "unknown";
  if (py >= totalJsTs && py > 0) primary = "python";
  else if (totalJsTs > 0) primary = "js_ts";
  return { primary, pyCount: py, jsCount: js, tsCount: ts };
}

export async function scanRepoFiles(opts: {
  includeGlobs: string[];
  excludeGlobs: string[];
  maxFiles: number;
  debug: boolean;
}): Promise<string[]> {
  const cwd = process.cwd();
  const include = opts.includeGlobs.length ? opts.includeGlobs : ["**/*"];
  const ignore = opts.excludeGlobs.length ? opts.excludeGlobs : [];

  // Keep it cheap: only scan relevant extensions for dependency parsing
  const patterns = include.map((g) =>
    g.includes("*")
      ? g
      : `${g.replace(/\/+$/, "")}/**/*`
  );

  const entries = await fg(patterns, {
    cwd,
    dot: false,
    ignore,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  // Filter to code-ish files
  const code = entries.filter((p) => {
    const lower = p.toLowerCase();
    return (
      lower.endsWith(".py") ||
      lower.endsWith(".js") ||
      lower.endsWith(".jsx") ||
      lower.endsWith(".ts") ||
      lower.endsWith(".tsx") ||
      lower.endsWith(".mjs") ||
      lower.endsWith(".cjs")
    );
  });

  if (code.length > opts.maxFiles) {
    const sliced = code.slice(0, opts.maxFiles);
    if (opts.debug) core.info(`Repo scan capped: ${code.length} -> ${sliced.length}`);
    return sliced;
  }
  return code;
}
