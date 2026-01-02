import { describe, it, expect } from "vitest";
import { renderCommentMarkdown } from "../src/scoring"; // ou comment.ts selon ton code

describe("comment markdown", () => {
  it("renders stable markdown", () => {
    const md = renderCommentMarkdown({
      ImpactScore: 72,
      verdict: "🔴 High impact",
      CSS: 20, DRS: 80, HCS: 70, AF: 55,
      topAffected: ["core/a.ts", "core/b.ts"],
      topDependents: ["app/main.ts"],
      dependencyAvailable: true,
      warnings: [],
    });

    expect(md).toMatchSnapshot();
  });
});
