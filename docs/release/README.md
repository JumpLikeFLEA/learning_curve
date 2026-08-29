# Release 1.0

Working files for the first Colloquiz release. The plan behind them is
`C:\Users\PC\.claude\plans\help-me-to-prepare-tidy-bear.md`.

| File | What it is |
| --- | --- |
| [`definition-of-ready-1.0.md`](./definition-of-ready-1.0.md) | **Start here.** The 1.0 checklist and the locked decisions |
| [`launch-checklist.md`](./launch-checklist.md) | The dashboard / DNS / account steps that are not code |
| [`content-gap.json`](./content-gap.json) | Live per-subject question counts and deficits |
| [`prompts/`](./prompts/README.md) | One paste-ready authoring prompt per short subject |
| [`legal/privacy-policy.md`](./legal/privacy-policy.md) | Canonical privacy text |
| [`legal/terms-of-service.md`](./legal/terms-of-service.md) | Canonical terms text |
| [`legal/subprocessors.md`](./legal/subprocessors.md) | Processor table the policy links to |
| [`handoff/next-session.md`](./handoff/next-session.md) | Prompt to start the next work session |
| [`../adr/0002-account-erasure.md`](../adr/0002-account-erasure.md) | Why erasure anonymises rather than deletes |

## Regenerating the content state

```
npx tsx --env-file=.env.local scripts/build-content-prompts.ts
```

Rewrites `content-gap.json` and the whole `prompts/` directory from the live bank, using
the anon key so the counts are exactly what a learner sees (`approved` + `shared` only).
Run it after every import — both the quotas and the do-not-repeat lists move.

## Working rule

One session per step. Each session ends by ticking the checklist, rewriting
`handoff/next-session.md` for the next step (archiving the previous one as
`handoff/<NN>-<step>.md`), and reporting progress.
