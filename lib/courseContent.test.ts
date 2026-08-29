import { describe, it, expect } from "vitest";
import { TheoryBlockSchema, TheoryBlocksSchema } from "./courseContent";

describe("TheoryBlockSchema — valid blocks", () => {
  const valid: [string, unknown][] = [
    ["prose", { type: "prose", body: "The limit exists iff both one-sided limits agree." }],
    ["formula", { type: "formula", body: "\\[\\lim_{x\\to a} f(x) = L\\]" }],
    [
      "example",
      {
        type: "example",
        statement: "Compute \\(\\lim_{x\\to 2}(x^2-4)/(x-2)\\).",
        steps: ["Factor the numerator.", "Cancel \\(x-2\\).", "Substitute \\(x=2\\) to get 4."],
      },
    ],
    ["callout note", { type: "callout", tone: "note", body: "Continuity is stronger than a limit." }],
    ["callout warning", { type: "callout", tone: "warning", body: "Do not cancel across an addition." }],
    // Prose / example / callout bodies allow embedded newlines (commit e82c3aa,
    // `authoredString(1, { allowNewlines: true })`); a paragraph can span lines.
    ["prose with newline", { type: "prose", body: "Line one.\nLine two." }],
    ["callout with newline", { type: "callout", tone: "note", body: "First point.\nSecond point." }],
    ["list ordered", { type: "list", ordered: true, items: ["First", "Second"] }],
    ["list unordered", { type: "list", ordered: false, items: ["A limit", "A one-sided limit"] }],
    ["definition", { type: "definition", term: "Continuous", body: "\\(f\\) is continuous at \\(a\\)…" }],
  ];

  it.each(valid)("%s parses", (_name, input) => {
    const r = TheoryBlockSchema.safeParse(input);
    expect(r.success).toBe(true);
  });

  it("validates an array of mixed blocks", () => {
    const r = TheoryBlocksSchema.safeParse(valid.map(([, b]) => b));
    expect(r.success).toBe(true);
  });
});

describe("TheoryBlockSchema — rejections", () => {
  const invalid: [string, unknown][] = [
    ["unknown type", { type: "quote", body: "x" }],
    ["missing discriminator", { body: "x" }],
    ["extra key (strict)", { type: "prose", body: "x", author: "me" }],
    ["misspelled field", { type: "prose", boddy: "x" }],
    ["empty prose body", { type: "prose", body: "" }],
    // Newlines are permitted ONLY in prose/example/callout bodies. Single-line
    // fields (formula body, list items, definition term/body) still reject them.
    ["embedded newline in formula", { type: "formula", body: "\\[a\\]\nb" }],
    ["embedded newline in list item", { type: "list", ordered: false, items: ["a\nb"] }],
    ["embedded tab in prose", { type: "prose", body: "a\tb" }],
    ["invalid callout tone", { type: "callout", tone: "danger", body: "x" }],
    ["empty steps array", { type: "example", statement: "s", steps: [] }],
    ["empty items array", { type: "list", ordered: true, items: [] }],
    ["definition missing term", { type: "definition", body: "x" }],
  ];

  it.each(invalid)("%s is rejected", (_name, input) => {
    expect(TheoryBlockSchema.safeParse(input).success).toBe(false);
  });
});
