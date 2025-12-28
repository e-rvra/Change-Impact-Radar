import { getOctokit as toolkitGetOctokit } from "@actions/github";
import type { context as Ctx } from "@actions/github/lib/context";
import * as core from "@actions/core";

export type Octokit = ReturnType<typeof toolkitGetOctokit>;

export type PullFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
};

export function getOctokit(token: string): Octokit {
  return toolkitGetOctokit(token);
}

export function ensurePullRequestContext(ctx: typeof Ctx): void {
  if (!ctx.payload.pull_request) {
    throw new Error("This action must run on pull_request / pull_request_target events.");
  }
}

export async function listPullRequestFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pull_number: number
): Promise<PullFile[]> {
  const per_page = 100;
  let page = 1;
  const out: PullFile[] = [];

  while (true) {
    const res = await octokit.rest.pulls.listFiles({ owner, repo, pull_number, per_page, page });
    for (const f of res.data) {
      out.push({
        filename: f.filename,
        status: f.status,
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
        changes: f.changes ?? 0,
      });
    }
    if (res.data.length < per_page) break;
    page++;
    if (page > 50) break; // hard safety cap
  }
  return out;
}

export async function getRepoMeta(octokit: Octokit, owner: string, repo: string): Promise<{ default_branch: string }> {
  const res = await octokit.rest.repos.get({ owner, repo });
  return { default_branch: res.data.default_branch };
}

export async function listIssueComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue_number: number
) {
  const per_page = 100;
  let page = 1;
  const out: any[] = [];
  while (true) {
    const res = await octokit.rest.issues.listComments({ owner, repo, issue_number, per_page, page });
    out.push(...res.data);
    if (res.data.length < per_page) break;
    page++;
    if (page > 50) break;
  }
  return out;
}

export async function createIssueComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue_number: number,
  body: string
) {
  return octokit.rest.issues.createComment({ owner, repo, issue_number, body });
}

export async function updateIssueComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  comment_id: number,
  body: string
) {
  return octokit.rest.issues.updateComment({ owner, repo, comment_id, body });
}
