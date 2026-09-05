import { type ReactNode } from "react";

/**
 * Inline markup for the math-aware text pipeline — currently **bold** only.
 *
 * This layer runs at the very end of the pipeline, on ONE line of plain text
 * that is already:
 *   - math-free: `segmentMath` (lib/richTextSegment) carved out every `\(…\)` /
 *     `\[…\]` span upstream, so a `**` inside a formula never reaches here and
 *     stays literal LaTeX;
 *   - newline-free: the caller (`renderLinesToNodes`) split on single `\n` and
 *     interleaves `<br>` itself.
 *
 * Both live render paths funnel their plain-text runs through `renderLinesToNodes`
 * (learner `RichText`, editor-preview `renderRichTextNodes`), so hooking here
 * makes bold render identically in both — and anywhere else `RichText` is used
 * (quiz review screens included). That breadth is intentional; scoring is
 * unaffected because it never round-trips a value through rendering.
 *
 * ADDING A RULE (italic, code, link): append to `RULES`. The scanner is generic
 * over `{ marker, tag }` — a new entry is a new row, not a rewrite. Ordering
 * matters only when one marker is a prefix of another (e.g. `*` vs `**`): list
 * the longer marker first so it wins the `startsWith` test.
 */

type InlineRule = {
  /** The literal delimiter, same on both sides. */
  marker: string;
  /** The intrinsic element wrapped around a matched pair's contents. */
  tag: "strong";
};

const RULES: readonly InlineRule[] = [{ marker: "**", tag: "strong" }];

/**
 * Parse inline markup in a single already-math-free, already-`\n`-free line.
 *
 * Pairing is greedy, leftmost-first: each opener takes the next occurrence of
 * its marker as the closer. No CommonMark flanking rules — deliberately simple.
 *
 * Guarantees (the load-bearing ones):
 *   - A marker with NO matching closer later on the line is emitted as literal
 *     text; the scan resumes immediately after it, so nothing downstream is
 *     swallowed and a valid pair further along still parses.
 *   - An empty pair (`****`) is literal, not an empty element.
 *   - Unmatched or absent markup returns the line as a single text node.
 */
export function parseInlineMarkup(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = "";
  let keySeq = 0;

  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = "";
    }
  };

  let i = 0;
  while (i < line.length) {
    const rule = RULES.find((r) => line.startsWith(r.marker, i));
    if (!rule) {
      buf += line[i];
      i += 1;
      continue;
    }

    const contentStart = i + rule.marker.length;
    const close = line.indexOf(rule.marker, contentStart);

    // No closer, or an empty pair — the opening marker is ordinary text. Resume
    // one marker-width along (not past the whole line) so later markup still parses.
    if (close === -1 || close === contentStart) {
      buf += rule.marker;
      i = contentStart;
      continue;
    }

    flush();
    const k = keySeq++;
    const Tag = rule.tag;
    nodes.push(
      <Tag key={`${keyPrefix}-m${k}`}>
        {parseInlineMarkup(line.slice(contentStart, close), `${keyPrefix}-m${k}i`)}
      </Tag>,
    );
    i = close + rule.marker.length;
  }

  flush();
  return nodes;
}
