import { describe, it, expect } from "vitest";
import { toggleWrap } from "./textareaMarkup";

/**
 * Selection notation, mirroring the flatten-to-a-string discipline of
 * inlineMarkup.test.tsx: `[` and `]` bracket the selection in the input, and
 * the result is rendered back the same way so a table can assert value + range
 * in one readable literal. `[]` is an empty selection (caret).
 */
function parse(s: string): { value: string; selStart: number; selEnd: number } {
  const selStart = s.indexOf("[");
  const afterOpen = s.slice(0, selStart) + s.slice(selStart + 1);
  const selEnd = afterOpen.indexOf("]");
  const value = afterOpen.slice(0, selEnd) + afterOpen.slice(selEnd + 1);
  return { value, selStart, selEnd };
}

function fmt(r: { value: string; selStart: number; selEnd: number }): string {
  return (
    r.value.slice(0, r.selStart) +
    "[" +
    r.value.slice(r.selStart, r.selEnd) +
    "]" +
    r.value.slice(r.selEnd)
  );
}

const t = (s: string, marker = "**") => {
  const { value, selStart, selEnd } = parse(s);
  return fmt(toggleWrap(value, selStart, selEnd, marker));
};

describe("toggleWrap — bold (**)", () => {
  describe("toggle ON", () => {
    const cases: [name: string, input: string, expected: string][] = [
      ["empty selection inserts an empty pair, caret between", "ab[]cd", "ab**[]**cd"],
      ["wrap a single word, inner text stays selected", "a [b] c", "a **[b]** c"],
      ["wrap a multi-word selection", "say [hello world] now", "say **[hello world]** now"],
      ["selection at string start (offset 0)", "[foo] bar", "**[foo]** bar"],
      ["selection at string end", "x [y]", "x **[y]**"],
      ["empty selection at offset 0", "[]foo", "**[]**foo"],
      ["empty selection at string end", "foo[]", "foo**[]**"],
    ];
    for (const [name, input, expected] of cases) {
      it(name, () => expect(t(input)).toBe(expected));
    }
  });

  // The toggle-OFF path has the most edge conditions: two structural shapes
  // (markers inside the selection vs. hugging it) crossed with position
  // (start / middle / end) and selection width.
  describe("toggle OFF", () => {
    const cases: [name: string, input: string, expected: string][] = [
      ["markers inside selection — mid-string", "a [**b**] c", "a [b] c"],
      ["markers hug selection — mid-string", "a **[b]** c", "a [b] c"],
      ["markers inside selection — multi-word", "[**hello world**]!", "[hello world]!"],
      ["markers hug selection — multi-word", "**[hello world]**!", "[hello world]!"],
      ["markers inside selection — at offset 0", "[**b**] c", "[b] c"],
      ["markers hug selection — at offset 0", "**[b]** c", "[b] c"],
      ["markers inside selection — at string end", "x [**y**]", "x [y]"],
      ["markers hug selection — at string end", "x **[y]**", "x [y]"],
      ["markers inside — whole string is the wrap", "[**b**]", "[b]"],
      ["markers hug — whole inner is selected, markers are all that's left", "**[b]**", "[b]"],
    ];
    for (const [name, input, expected] of cases) {
      it(name, () => expect(t(input)).toBe(expected));
    }

    it("round-trips: wrap then unwrap the same span", () => {
      const on = toggleWrap("a b c", 2, 3, "**");
      expect(on).toEqual({ value: "a **b** c", selStart: 4, selEnd: 5 });
      const off = toggleWrap(on.value, on.selStart, on.selEnd, "**");
      expect(off).toEqual({ value: "a b c", selStart: 2, selEnd: 3 });
    });
  });

  describe("never corrupts partial / unmatched markers", () => {
    it("a bare '**' selection is NOT unwrapped to empty", () => {
      expect(t("[**]")).not.toBe("[]");
      expect(t("[**]")).toBe("**[**]**");
    });
    it("leading-only marker in selection is treated as plain text (wrapped)", () => {
      // '**b' starts with the marker but has no closing pair — not a wrap.
      expect(t("x [**b] c")).toBe("x **[**b]** c");
    });
    it("empty wrapped pair inside selection unwraps to empty text", () => {
      expect(t("a [****] b")).toBe("a [] b");
    });
    it("marker hugging on one side only is not an unwrap", () => {
      expect(t("**[b] c")).toBe("****[b]** c");
    });
  });

  it("works for a single-char marker too (marker-agnostic)", () => {
    expect(t("a [b] c", "`")).toBe("a `[b]` c");
    expect(t("a `[b]` c", "`")).toBe("a [b] c");
    expect(t("a [`b`] c", "`")).toBe("a [b] c");
  });
});
