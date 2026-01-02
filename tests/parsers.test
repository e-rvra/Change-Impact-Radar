import { describe, it, expect } from "vitest";
import { parsePythonImports, parseTsImports } from "../src/parsers"; // adapte si noms différents

describe("parsers - python", () => {
  it("parses 'import a, b' and 'import a as x'", () => {
    const code = `
import os, sys
import numpy as np
from pkg.sub import thing
from .local import x
from ..parent import y
`;
    const imps = parsePythonImports(code);
    expect(imps).toEqual(expect.arrayContaining([
      "os", "sys",
      "numpy",
      "pkg.sub",
      ".local",
      "..parent",
    ]));
  });

  it("handles weird spacing and tabs", () => {
    const code = "from   a.b\timport   c\nimport\tfoo\n";
    const imps = parsePythonImports(code);
    expect(imps).toEqual(expect.arrayContaining(["a.b", "foo"]));
  });
});

describe("parsers - ts/js", () => {
  it("parses import/export forms including type imports", () => {
    const code = `
import x from "./x";
import { a, b as bb } from "../lib/y";
import type { T } from "./types";
export { z } from "./z";
export * from "../core/k";
const r = require("./r");
`;
    const imps = parseTsImports(code);
    expect(imps).toEqual(expect.arrayContaining([
      "./x", "../lib/y", "./types", "./z", "../core/k", "./r"
    ]));
  });

  it("ignores bare imports (external deps)", () => {
    const code = `import react from "react"; import "lodash";`;
    const imps = parseTsImports(code);
    // selon ton design: soit tu ne les retournes pas, soit tu les retournes mais graph les ignore
    // je recommande "ignore" -> plus stable
    expect(imps).not.toEqual(expect.arrayContaining(["react", "lodash"]));
  });
});

