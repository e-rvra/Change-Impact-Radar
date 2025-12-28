import * as core from "@actions/core";
import { listIssueComments, createIssueComment, updateIssueComment, Octokit } from "./github";

const MARKER = "<!-- change-impact-radar -->";

export async function upsertPullRequestComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  mode: string,
  debug: boolean
): Promise<void> {
  if (mode === "recreate") {
    await createIssueComment(octokit, owner, repo, prNumber, body);
    core.info("Posted new comment (comment_mode=recreate).");
    return;
  }

  // update mode: find existing comment with marker; update first match
  const comments = await listIssueComments(octokit, owner, repo, prNumber);
  const found = comments.find((c: any) => typeof c.body === "string" && c.body.includes(MARKER));

  if (found) {
    await updateIssueComment(octokit, owner, repo, found.id, body);
    core.info(`Updated existing Change Impact Radar comment (id=${found.id}).`);
  } else {
    await createIssueComment(octokit, owner, repo, prNumber, body);
    core.info("Created Change Impact Radar comment (no existing marker found).");
  }

  if (debug) core.info(`Total PR comments scanned: ${comments.length}`);
}
