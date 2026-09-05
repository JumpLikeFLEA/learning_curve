/**
 * Pure selection-toggle primitive for a textarea's inline markup (e.g. **bold**).
 *
 * No DOM, no React: given the current textarea `value` and the selection range
 * `[selStart, selEnd)`, return the new value and the new selection the caller
 * should re-apply. The Bold toolbar button is the first consumer.
 *
 * Toggle semantics for `marker` (the string wrapped on each side, "**" for bold):
 *
 *  - Empty selection: insert an empty `marker`+`marker` pair and park the caret
 *    between the two markers.
 *  - Non-empty, not already wrapped: wrap the selection; the returned range
 *    selects the inner text only (markers excluded).
 *  - Non-empty, already wrapped — either the markers are *inside* the selection
 *    (`**…**` is selected) or they *hug* it (the chars just outside the
 *    selection are `**…**`): strip that one pair; the returned range selects the
 *    now-unwrapped text.
 *
 * A partial/unmatched marker (`**foo`, a bare `**`) is never treated as a wrap
 * to strip — it falls through to the wrap-on branch, same as any other text.
 */
export function toggleWrap(
  value: string,
  selStart: number,
  selEnd: number,
  marker: string,
): { value: string; selStart: number; selEnd: number } {
  const m = marker;
  const L = m.length;

  // Empty selection: drop an empty pair, caret between the markers.
  if (selStart === selEnd) {
    return {
      value: value.slice(0, selStart) + m + m + value.slice(selStart),
      selStart: selStart + L,
      selEnd: selStart + L,
    };
  }

  const selected = value.slice(selStart, selEnd);

  // Toggle off — markers sit *inside* the selection: [**…**]
  if (selected.length >= 2 * L && selected.startsWith(m) && selected.endsWith(m)) {
    const inner = selected.slice(L, selected.length - L);
    return {
      value: value.slice(0, selStart) + inner + value.slice(selEnd),
      selStart,
      selEnd: selStart + inner.length,
    };
  }

  // Toggle off — markers *hug* the selection: **[…]**
  if (
    selStart - L >= 0 &&
    value.slice(selStart - L, selStart) === m &&
    value.slice(selEnd, selEnd + L) === m
  ) {
    return {
      value: value.slice(0, selStart - L) + selected + value.slice(selEnd + L),
      selStart: selStart - L,
      selEnd: selEnd - L,
    };
  }

  // Toggle on — wrap, keeping the inner text selected.
  return {
    value: value.slice(0, selStart) + m + selected + m + value.slice(selEnd),
    selStart: selStart + L,
    selEnd: selEnd + L,
  };
}
