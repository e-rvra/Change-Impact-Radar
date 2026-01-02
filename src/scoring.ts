import * as core from "@actions/core";
import { PullFile } from "./github";
import { DepGraph } from "./graph";
import { clamp, pickTop } from "./util";

export enum Verdict {
  Low = "🟢 Low impact",
  Medium = "🟡 Medium impact",
  High = "🔴 High impact",
}

export type ScoreResult = {
  CSS: number;
  DRS: number;
  HCS: number;
  AF: number;
  ImpactScore: number;
  verdict: Verdict;
  commentMarkdown: string;
};

export function formatAmplificationLabel(AF: number): "Low" | "Medium" | "High" {
  const x = Math.abs(AF);
  if (x < 15) return "Low";
  if (x < 35) return "Medium";
  return "High";
}

export function computeScores(opts: {
  prFiles: PullFile[];
  graph: DepGraph | null;
  maxDepth: number;
  hotspotPaths: string[];
  debug: boolean;
}): ScoreResult {
  const { prFiles, graph, maxDepth, hotspotPaths, debug } = opts;

  // --- CSS (size) ---
  const filesChanged = prFiles.length;
  const totalLines = prFiles.reduce((a, f) => a + (f.additions + f.deletions), 0);

  // Mild sensitivity weighting (optional, minimal): tests lower, core higher
  const sensitiveBoost = prFiles.reduce((a, f) => a + sensitivityWeight(f.filename, hotspotPaths), 0) / Math.max(1, filesChanged);

  // log scaling: 0..100
  const cssFiles = 100 * (1 - Math.exp(-filesChanged / 18)); // ~18 files -> 63
  const cssLines = 100 * (1 - Math.exp(-totalLines / 650));  // ~650 LOC -> 63
  let CSS = Math.round(clamp(0.55 * cssLines + 0.45 * cssFiles + 8 * sensitiveBoost, 0, 100));

  // --- DRS (reach) ---
  let DRS = 0;
  let HCS = 0;
  let topAffected: { file: string; reach: number; dependents: number }[] = [];
  let topDependents: { file: string; dependents: number }[] = [];

  if (graph && graph.nodes.size > 0) {
    const modified = prFiles.map((f) => f.filename).filter((f) => graph.nodes.has(f));
    const totalNodes = graph.nodes.size;

    // reach from each modified file (BFS depth-limited)
    const reachMap = new Map<string, number>();
    const depMap = new Map<string, number>();

    for (const mf of modified) {
      const reach = bfsReach(graph, mf, maxDepth);
      const rev = bfsReverseReach(graph, mf, maxDepth);
      reachMap.set(mf, reach.size - 1); // exclude self
      depMap.set(mf, rev.size - 1);
    }

    const avgReach = modified.length
      ? Array.from(reachMap.values()).reduce((a, b) => a + b, 0) / modified.length
      : 0;

    // Normalize by repo size: reach ratio
    const reachRatio = totalNodes > 1 ? avgReach / (totalNodes - 1) : 0;
    DRS = Math.round(clamp(100 * (1 - Math.exp(-reachRatio * 6.0)), 0, 100)); // compress

    // --- HCS (hotspot + coupling) ---
    // coupling from degrees of modified files vs max degree
    let maxDeg = 1;
    for (const n of graph.nodes) maxDeg = Math.max(maxDeg, graph.degree(n));

    const avgDegNorm = modified.length
      ? modified.reduce((a, f) => a + graph.degree(f) / maxDeg, 0) / modified.length
      : 0;

    const hotspotHitRate = prFiles.reduce((a, f) => a + (isHotspot(f.filename, hotspotPaths) ? 1 : 0), 0) / Math.max(1, prFiles.length);

    // HCS: mostly coupling + some hotspot path criticality
    HCS = Math.round(clamp(75 * avgDegNorm + 25 * hotspotHitRate, 0, 100));

    topAffected = prFiles
      .map((f) => {
        const r = reachMap.get(f.filename) ?? 0;
        const d = depMap.get(f.filename) ?? 0;
        return { file: f.filename, reach: r, dependents: d };
      })
      .sort((a, b) => (b.reach + 0.5 * b.dependents) - (a.reach + 0.5 * a.dependents))
      .slice(0, 5);

    // top dependents across graph (global), cheap approximation: highest in-degree
    const all = Array.from(graph.nodes).map((n) => ({ file: n, dependents: graph.inNeighbors(n).length }));
    topDependents = pickTop(all, 5, (x) => x.dependents).filter((x) => x.dependents > 0);
  } else {
    DRS = 0;
    HCS = Math.round(clamp(20 * (prFiles.some((f) => isHotspot(f.filename, hotspotPaths)) ? 1 : 0), 0, 100));
  }

  // --- Amplification + final score ---
  const AFraw = (0.55 * DRS + 0.45 * HCS) - 0.6 * CSS;
  const AF = clamp(AFraw, -100, 100);
  const ImpactScore = clamp(
    Math.round(0.5 * CSS + 0.5 * (0.6 * DRS + 0.4 * HCS) + Math.max(0, AF)),
    0,
    100
  );

  const verdict =
    ImpactScore <= 39 ? Verdict.Low : ImpactScore <= 69 ? Verdict.Medium : Verdict.High;

  const ampLabel = formatAmplificationLabel(AF);

  const md = renderComment({
    ImpactScore,
    verdict,
    AF,
    ampLabel,
    CSS,
    DRS,
    HCS,
    topAffected,
    topDependents,
    dependencyAvailable: !!graph,
  });

  return { CSS, DRS, HCS, AF, ImpactScore, verdict, commentMarkdown: md };
}

function bfsReach(graph: DepGraph, start: string, maxDepth: number): Set<string> {
  const seen = new Set<string>([start]);
  let frontier = new Set<string>([start]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = new Set<string>();
    for (const n of frontier) {
      for (const nb of graph.outNeighbors(n)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          next.add(nb);
        }
      }
    }
    if (next.size === 0) break;
    frontier = next;
  }
  return seen;
}

function bfsReverseReach(graph: DepGraph, start: string, maxDepth: number): Set<string> {
  const seen = new Set<string>([start]);
  let frontier = new Set<string>([start]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = new Set<string>();
    for (const n of frontier) {
      for (const nb of graph.inNeighbors(n)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          next.add(nb);
        }
      }
    }
    if (next.size === 0) break;
    frontier = next;
  }
  return seen;
}

function isHotspot(file: string, hotspotPaths: string[]): boolean {
  const f = file.replace(/\\/g, "/");
  return hotspotPaths.some((p) => {
    const pp = p.replace(/\\/g, "/").replace(/\/+$/, "");
    return pp.length > 0 && (f === pp || f.startsWith(pp + "/"));
  });
}

function sensitivityWeight(file: string, hotspotPaths: string[]): number {
  const f = file.toLowerCase();
  // tests are less sensitive
  if (f.includes("/test") || f.includes("__tests__") || f.endsWith(".spec.ts") || f.endsWith(".test.ts") || f.endsWith(".test.py")) return -0.4;
  // hotspot paths slightly more sensitive
  if (isHotspot(file, hotspotPaths)) return 0.7;
  // core-ish names
  if (f.includes("core") || f.includes("kernel") || f.includes("auth") || f.includes("payments")) return 0.3;
  return 0.0;
}

function renderComment(x: {
  ImpactScore: number;
  verdict: Verdict;
  AF: number;
  ampLabel: string;
  CSS: number;
  DRS: number;
  HCS: number;
  topAffected: { file: string; reach: number; dependents: number }[];
  topDependents: { file: string; dependents: number }[];
  dependencyAvailable: boolean;
}): string {
  const marker = "<!-- change-impact-radar -->";
  const depLine = x.dependencyAvailable ? "" : "\n> Dependency analysis not available (using change size only / partial heuristics).";

  const topAffectedLines =
    x.topAffected.length > 0
      ? x.topAffected
          .map((r) => `- \`${r.file}\` — reach≈**${r.reach}**, dependents≈**${r.dependents}**`)
          .join("\n")
      : "- (not enough data)";

  const topDepLines =
    x.topDependents.length > 0
      ? x.topDependents.map((r) => `- \`${r.file}\` — direct dependents≈**${r.dependents}**`).join("\n")
      : "- (not available)";

  const rec =
    x.verdict === Verdict.Low
      ? `- Keep the usual review depth.\n- Run the standard CI suite.`
      : x.verdict === Verdict.Medium
      ? `- Do a slightly deeper review on touched modules.\n- Consider running a broader test subset if available.`
      : `- Consider requesting an owner/maintainer review for impacted areas.\n- Prefer running an expanded test suite (integration/e2e if you have it).`;

  return `${marker}
## Change Impact Radar

- **Impact Score:** **${x.ImpactScore}/100** (${x.verdict.split(" ")[0]})
- **Verdict:** ${x.verdict}
- **Amplification:** **${x.ampLabel}** (AF = **${x.AF.toFixed(1)}**)
- **Change size:** CSS = **${x.CSS}**
- **Dependency reach:** DRS = **${x.DRS}**
- **Hotspot coupling:** HCS = **${x.HCS}**${depLine}

### Top affected areas
**Top 5 modified files (estimated reach)**
${topAffectedLines}

**Top 5 dependency hotspots (direct dependents)**
${topDepLines}

### Recommendations
${rec}

<sub>Notes: Scores are best-effort and static (no code execution). Treat as a prioritization hint, not a truth oracle.</sub>
`;
}
