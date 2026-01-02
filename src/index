import * as core from "@actions/core";
import { context } from "@actions/github";
import {
  getOctokit,
  ensurePullRequestContext,
  listPullRequestFiles,
  getRepoMeta,
} from "./github";
import { detectPrimaryLanguages, scanRepoFiles } from "./scan";
import { buildDependencyGraph, GraphBuildResult } from "./graph";
import { computeScores, Verdict } from "./scoring";
import { upsertPullRequestComment } from "./comment";
import { clamp, parseCsv, toBool } from "./util";

async function run(): Promise<void> {
  const debug = toBool(core.getInput("debug"));

  // ✅ Token: optional input + fallback to default GITHUB_TOKEN
  const inputToken = core.getInput("github_token");
  const token = inputToken || process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "No GitHub token available. Provide input 'github_token' or ensure 'GITHUB_TOKEN' is set in the environment."
    );
  }

  const maxDepth = clamp(parseInt(core.getInput("max_depth") || "4", 10) || 4, 1, 12);
  const maxFiles = clamp(parseInt(core.getInput("max_files") || "5000", 10) || 5000, 200, 50000);

  const includeGlobs = parseCsv(core.getInput("include_globs"));
  const excludeGlobs = parseCsv(core.getInput("exclude_globs"));
  const hotspotPaths = parseCsv(core.getInput("hotspot_paths"));
  const commentMode = (core.getInput("comment_mode") || "update").toLowerCase();
  const failOnHigh = toBool(core.getInput("fail_on_high"));

  ensurePullRequestContext(context);

  const octokit = getOctokit(token);
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request!.number;

  core.startGroup("Change Impact Radar: Fetch PR changes");
  const prFiles = await listPullRequestFiles(octokit, owner, repo, prNumber);
  const repoMeta = await getRepoMeta(octokit, owner, repo);
  core.info(`PR files: ${prFiles.length}`);
  if (debug) core.info(`Default branch: ${repoMeta.default_branch}`);
  core.endGroup();

  core.startGroup("Change Impact Radar: Detect languages & scan repo");
  const lang = detectPrimaryLanguages(prFiles);
  core.info(
    `Primary language guess: ${lang.primary} (py=${lang.pyCount}, js=${lang.jsCount}, ts=${lang.tsCount})`
  );

  // Best-effort repo scan. If it fails, we'll degrade to CSS-only.
  let graphResult: GraphBuildResult | null = null;
  try {
    const repoFiles = await scanRepoFiles({
      includeGlobs,
      excludeGlobs,
      maxFiles,
      debug,
    });

    core.info(`Scanned ${repoFiles.length} repo files (cap=${maxFiles}).`);
    graphResult = buildDependencyGraph({
      repoFiles,
      primary: lang.primary,
      maxFiles,
      debug,
    });
    core.info(
      `Dependency graph nodes=${graphResult.graph.nodes.size}, edges=${graphResult.graph.edgeCount()} (skipped external imports: ${graphResult.stats.externalImports})`
    );
  } catch (e: any) {
    core.warning(`Dependency analysis not available: ${e?.message ?? String(e)}`);
    graphResult = null;
  }
  core.endGroup();

  core.startGroup("Change Impact Radar: Scoring");
  const scores = computeScores({
    prFiles,
    graph: graphResult?.graph ?? null,
    maxDepth,
    hotspotPaths,
    debug,
  });

  core.info(
    `CSS=${scores.CSS} DRS=${scores.DRS} HCS=${scores.HCS} AF=${scores.AF.toFixed(
      1
    )} Impact=${scores.ImpactScore} Verdict=${scores.verdict}`
  );
  core.endGroup();

  core.startGroup("Change Impact Radar: Comment PR");
  const md = scores.commentMarkdown;
  await upsertPullRequestComment(octokit, owner, repo, prNumber, md, commentMode, debug);
  core.endGroup();

  if (failOnHigh && scores.verdict === Verdict.High) {
    core.setFailed("Impact verdict is 🔴 (High). fail_on_high=true");
  }
}

run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
