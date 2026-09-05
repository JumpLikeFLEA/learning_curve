import { describe, it, expect } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { parseInlineMarkup } from "./inlineMarkup";

/**
 * Flatten a parseInlineMarkup result to a debug string:
 *   plain text stays as-is, a <strong> becomes `[bold]…[/bold]` (recursively).
 * Lets the table below assert structure without a DOM renderer.
 */
function show(nodes: ReactNode[]): string {
  return nodes
    .map((n): string => {
      if (typeof n === "string") return n;
      if (isValidElement(n)) {
        const el = n as React.ReactElement<{ children?: ReactNode }>;
        const tag = typeof el.type === "string" ? el.type : "?";
        const kids = el.props.children;
        const inner = Array.isArray(kids)
          ? show(kids as ReactNode[])
          : show([kids as ReactNode]);
        return `[${tag}]${inner}[/${tag}]`;
      }
      return "";
    })
    .join("");
}

const p = (s: string) => show(parseInlineMarkup(s, "k"));

describe("parseInlineMarkup — bold", () => {
  const cases: [name: string, input: string, expected: string][] = [
    ["no markup is one text node", "the limit exists", "the limit exists"],
    ["bold in plain prose", "a **bold** word", "a [strong]bold[/strong] word"],
    ["bold at line start and end", "**all** of **it**", "[strong]all[/strong] of [strong]it[/strong]"],
    ["two separate pairs on one line", "**a** **b**", "[strong]a[/strong] [strong]b[/strong]"],
    [
      "marker adjacent to (already-removed) math placeholder text",
      "before **x** after",
      "before [strong]x[/strong] after",
    ],
    ["lone unmatched marker is literal, swallows nothing", "foo ** bar baz", "foo ** bar baz"],
    // Pairing is greedy leftmost-first (no CommonMark flanking rules): the 1st
    // and 2nd markers pair, the 3rd is the leftover and renders literally.
    ["greedy pairing leaves the odd marker literal", "** then **real** ", "[strong] then [/strong]real** "],
    ["empty pair is literal, not an empty element", "a **** b", "a **** b"],
    ["triple marker: pair then lone", "**a**b**", "[strong]a[/strong]b**"],
    ["marker touching text on both sides", "x**y**z", "x[strong]y[/strong]z"],
    ["asterisks that are not doubled are untouched", "2 * 3 * 4", "2 * 3 * 4"],
    ["single asterisk pair is not bold (bold only)", "*not italic*", "*not italic*"],
  ];

  for (const [name, input, expected] of cases) {
    it(name, () => expect(p(input)).toBe(expected));
  }

  it("keys are unique across nodes on a line", () => {
    const nodes = parseInlineMarkup("**a** plain **b**", "k") as React.ReactElement[];
    const keys = nodes.filter(isValidElement).map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.filter(Boolean).length);
  });
});
