import { describe, it, expect } from "vitest";
import { buildDependencyGraph } from "../src/graph"; // adapte
import { parseImportsForFile } from "../src/parsers"; // adapte

function mkFiles(map: Record<string, string>) {
  return Object.entries(map).map(([path, content]) => ({ path, content }));
}

describe("graph", () => {
  it("builds edges for local imports and handles cycles", () => {
    const files = mkFiles({
      "src/a.ts": `import {b} from "./b"; export const a=1;`,
      "src/b.ts": `import {a} from "./a"; export const b=1;`,
    });

    const g = buildDependencyGraph(files, {
      maxDepth: 6,
      maxFiles: 1000,
    });

    // attend un cycle a<->b
    expect(g.edges.get("src/a.ts")).toContain("src/b.ts");
    expect(g.edges.get("src/b.ts")).toContain("src/a.ts");
  });

  it("respects maxDepth", () => {
    const files = mkFiles({
      "src/a.ts": `import "./b";`,
      "src/b.ts": `import "./c";`,
      "src/c.ts": `import "./d";`,
      "src/d.ts": `export {};`,
    });

    const g = buildDependencyGraph(files, { maxDepth: 1, maxFiles: 1000 });
    // depth=1: a -> b seulement, pas jusqu'à c/d
    expect(g.edges.get("src/a.ts")).toContain("src/b.ts");
    expect(g.edges.get("src/b.ts") || []).not.toContain("src/c.ts");
  });
});
