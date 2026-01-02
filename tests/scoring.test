import { describe, it, expect } from "vitest";
import { computeScores } from "../src/scoring"; // adapte

describe("scoring", () => {
  it("uses CSS-only fallback when graph missing", () => {
    const s = computeScores({
      pr: { filesChanged: 10, additions: 100, deletions: 20, touched: ["a.ts"] },
      graph: null,
      hotspots: ["src/"],
    });
    expect(s.DependencyAvailable).toBe(false);
    expect(s.DRS).toBe(0);
  });

  it("high DRS can elevate impact even for small change size", () => {
    const s = computeScores({
      pr: { filesChanged: 1, additions: 5, deletions: 0, touched: ["core/central.ts"] },
      graph: {
        totalNodes: 100,
        // mock minimal: reach / degrees / etc selon ton compute
        avgReach: 60,
        avgDegree: 10,
        dependencyAvailable: true,
      },
      hotspots: ["core/"],
    });

    // On ne force pas un score exact (trop fragile), mais un ordre:
    expect(s.DRS).toBeGreaterThan(50);
    expect(s.ImpactScore).toBeGreaterThan(40);
  });

  it("verdict threshold boundaries are stable", () => {
    // Ici tu peux tester directement une fonction verdictFromScore si tu l’as,
    // sinon: construire 3 cas qui donnent ~39 / ~40 / ~70
    // But: pas de régression sur emoji/seuils
  });
});
