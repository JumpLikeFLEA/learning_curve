# Authoring Guide — Adding Questions Manually

Questions live in `data/questions.json` as a JSON array. Each object represents one question. Add new entries to the array and restart the dev server — they'll appear immediately.

---

## Field Reference

### `id` — string (required)
A unique identifier. Use a short descriptive slug or a UUID.
```
"id": "q-042"
"id": "550e8400-e29b-41d4-a716-446655440000"
```

### `type` — string (required)
Always `"multiple_choice"` in Phase 1.

### `tags` — string[] (required)
1–3 lowercase topic tags. Used for filtering in Browse & Build.
```
"tags": ["pandas"]
"tags": ["sql", "window functions"]
"tags": ["statistics", "probability"]
```
Use consistent tag names — check existing questions for established tags before creating new ones.

### `difficulty` — string (required)
One of: `"easy"` | `"medium"` | `"hard"`

| Level | What it tests |
|-------|--------------|
| easy | Recall — definitions, what does X mean, basic syntax |
| medium | Application — given a scenario, what is the output or best approach |
| hard | Analysis — edge cases, subtle behavior, tradeoffs, common misconceptions |

### `question` — string (required)
A single, clear question ending with `?`. Avoid ambiguity — there must be exactly one defensibly correct answer.

Good: `"Which pandas method returns the number of non-null values per column?"`
Bad: `"What does count do?"` (too vague)

### `options` — [string, string, string, string] (required)
Exactly 4 options. One must match `correct_answer` verbatim.

Guidelines:
- Keep all options roughly the same length and grammatical form
- Make distractors plausible — use real misconceptions, not obvious nonsense
- Avoid "all of the above" and "none of the above"

### `correct_answer` — string (required)
Must be the **verbatim text** of the correct option. Copy-paste from `options`.

### `explanation` — string (required)
2–4 sentences shown to the user after they answer. Structure: why the correct answer is right + why the most tempting wrong answer is wrong.

### `created_at` — string (required)
ISO 8601 timestamp: `"2026-05-29T00:00:00.000Z"`

### `source` — string (required)
Use `"manual"` for hand-authored questions. AI-generated questions use `"ai_generated"` automatically.

---

## Full Example

```json
{
  "id": "q-016",
  "type": "multiple_choice",
  "tags": ["pandas"],
  "difficulty": "medium",
  "question": "What does df.pivot_table() use as the aggregation function by default?",
  "options": [
    "sum",
    "mean",
    "count",
    "first"
  ],
  "correct_answer": "mean",
  "explanation": "df.pivot_table() defaults to aggfunc='mean', computing the average of values for each cell. This differs from df.pivot(), which requires unique index/column combinations and performs no aggregation.",
  "created_at": "2026-05-29T00:00:00.000Z",
  "source": "manual"
}
```

---

## Tag Conventions

| Tag | Covers |
|-----|--------|
| `statistics` | Descriptive stats, probability, hypothesis testing, distributions |
| `pandas` | DataFrame operations, indexing, groupby, reshaping |
| `sql` | Queries, joins, aggregation, window functions |

Add new tags freely, but prefer existing ones to keep filters useful.
