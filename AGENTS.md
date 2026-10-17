# AGENTS.md

Operational workflow for any agent working in the `video-play-npm` repository.

This file is the **single source of truth** for how a change is planned, reviewed,
implemented, versioned, documented, committed, pushed, and released.

> Written in **English**. Do not translate it.

---

## Repository

This workflow applies to the project **`video-play-npm`** only. Its remote is:

```
https://github.com/jjbb44371-bot/video-play-npm.git
```

Before pushing or releasing, confirm you are in this project and that `git remote -v`
points at this remote. If it does not match, do not push yet: find out why it differs and
fix it (wrong directory, wrong remote, renamed repo, stale fork, etc.), then verify again
before proceeding. Never push or release to another repository.

---

## Configuration file

Process metadata lives in [`project.config.json`](./project.config.json):

- `version` — the canonical version number.
- `languages` — the documentation languages that must exist and stay linked.
- `defaultLanguage` — the language used by the un-suffixed doc files.
- `changelog` — the file that accumulates release notes.

Read it before a version bump or a documentation change.

---

## The workflow (in order)

1. **Plan** — produce a plan table with columns `# / Area or File / Change / Reason /
   Type`, and declare the intended release stage. `Type` is `code`, `docs`,
   `config-basic`, or `config-advanced`. Save the plan as a document under `docs/`
   (see Plan documents).
2. **Author review** — present the plan and stop. On acceptance, update the plan document
   to `accepted` and record what was accepted. Do not touch code until the author agrees.
3. **Implement** — split the work across subagents (one agent per part) instead of a single
   agent writing everything. Report progress as `NN% — <current task>` and update the plan
   document status as work proceeds.
4. **Version bump** — update `version` in `project.config.json` using the versioning
   policy and the approved stage; keep every `package.json` version in sync.
5. **Documentation** — update docs in every configured language and keep them
   cross-linked; create docs for any newly configured language.
6. **Release notes** — write English-only notes listing every change and every fix
   exhaustively; content is required; prepend them to the changelog.
7. **Commit** — commit in batches: each logical step is its own commit, not one giant
   commit. Subject: `<type>(<area>): <summary> (v<version>)`. The body must list every
   change in detail, in English.
8. **Push** — verify the remote matches the repository above, then push the batches. The
   pushed code is what CI builds.
9. **Compile and test** — CI does **not** run on its own. After pushing, trigger the
   workflow **manually** (`workflow_dispatch` via the GitHub CLI/API), then check the runs:
   find the **newest** run, select it, and poll its status every 30 seconds using a timer.
   If it reports success, continue to the next step. If it reports failure, find the cause,
   fix it, and trigger again — repeating this process up to a maximum of **36** attempts,
   then stop and report. Skip per the applicability policy below.
10. **Clean up** — delete everything a local test run created (temporary data, uploaded
    files, database rows or files, logs, generated artifacts) so leftovers cannot skew
    later test results.
11. **Publish the release** — verify the remote again, then tag the version and push the
    tag, and publish the release with the same English notes as the changelog. Mark it a
    pre-release unless the stage is `stable`.

---

## Plan documents

- Before implementing anything, write the plan as a numbered document in `docs/` in the
  project root (e.g. `docs/plan-1.md`). Plan documents are written in **English**.
- A plan has a status: `draft` → `accepted` → `in progress` → `done`.
- On acceptance, mark the document `accepted` and record what was accepted and any
  follow-up updates.
- Keep the document updated as the work and its status change.
- Report progress as `NN% — <current task>` so the author can follow along.
- Commit and push in batches (one logical step per batch) so history stays readable.

---

## Versioning policy

Format `MAJOR.MINOR.PATCH`, each segment a single digit `0`–`9`.

- Small change (fix, tweak) → bump `PATCH`.
- Large change (feature, behavior, API, or dependency change) → bump `MINOR`, reset
  `PATCH`.
- Carry overflow to the next segment (e.g. `1.9.x` + large → `2.0.0`).
- A pre-release appends `-<stage>.<N>` (`N` a single digit). The base version stays fixed
  across a pre-release line; dropping the suffix marks it `stable`.

---

## Release stages

`alpha` → `beta` → `preview` → `rc` → `stable`.

- Default to `stable` unless the plan says otherwise.
- `alpha`, `beta`, `preview`, and `rc` are published as pre-releases; only `stable` is
  the latest release.
- Promote only after the previous stage tested clean.

---

## Compile / Test applicability

- Code, or advanced configuration that can affect behavior/runtime → **required**.
- Documentation only, or basic configuration → **skip**.
- When unsure, treat it as required.
- Build and tests run on GitHub Actions (`.github/workflows/ci.yml`), triggered manually
  after pushing, then polled every 30 seconds, with a maximum of 36 attempts.
- Whenever tests run, they must be followed by cleanup (step 10).

---

## Documentation layout

- The `defaultLanguage` uses the un-suffixed file; other languages use a suffix
  (e.g. `README.md` / `README.vi.md`).
- User-facing docs start with a language switcher linking the versions. English-only docs
  (`AGENTS.md`, `CHANGELOG.md`) are not translated and have no switcher.

---

## Release notes and changelog

English only, exhaustive, and identical in the changelog and the release body.

---

## Language

- Talk to the author in the author's own language. Mixing languages (e.g. Vietnamese and
  English) in conversation is fine.
- Written artifacts — plan documents, code, commit messages, changelog, and AGENTS.md —
  stay in **English**. User-facing docs follow the configured languages.

---

## Rules for the agent

1. No implementation, version bump, or release without the plan being approved.
2. Always start with the plan.
3. Never skip required compile/test.
4. Trigger CI manually after pushing (it does not run on its own), check the newest run,
   and poll it every 30 seconds: on success continue; on failure fix and re-trigger, capped
   at a maximum of 36 attempts.
5. After testing, always clean up the artifacts the test run created.
6. Confirm the target repository before every push and release. If it does not match,
   find out why and fix it before proceeding; never act on a repo that is not
   `video-play-npm`.
7. Commit before pushing; push before releasing.
8. Every release declares a stage and uses the matching version suffix.
9. Commit messages are English-only and list every change in detail.
10. Release notes are English-only and exhaustive; a release must contain its content.
11. Written artifacts (plan documents, code, commits, changelog, AGENTS.md) stay in
    English; talk to the author in the author's own language.
12. Split implementation across subagents (one agent per part) instead of writing
    everything in a single agent.
