# AGENTS.md — privion-consent

This file describes how to work on the `@privion-consent/*` packages for both human contributors and AI coding agents.

The top section is **self-contained** — everything an external contributor needs to open a useful PR is here, without following links into private resources. The "Standards" section below it links to internal Dreher.Media docs that are private; those links resolve only for authenticated members of the org.

---

## Quick start (everyone)

`privion-consent` is a TypeScript monorepo of three (soon four) packages for GDPR/ePrivacy consent management with Google Consent Mode v2 support:

- `@privion-consent/core` — framework-agnostic consent engine
- `@privion-consent/dom` — DOM adapter (scripts, iframes, visibility)
- `@privion-consent/react` — React bindings

Tooling: pnpm workspaces, Turbo, Vite + Vitest, release-please for monorepo releases.

### Setup

```bash
pnpm install
```

Requires Node `>=18` and pnpm `10.x` (pinned via `packageManager` in `package.json`).

### Develop

- Source lives in `packages/*/src/`.
- `pnpm type-check` — TypeScript with `--noEmit` across all packages.
- `pnpm format` / `pnpm format:check` — Prettier write / check.
- `pnpm lint` — ESLint across all packages.
- `pnpm test` — Vitest across all packages.
- `pnpm verify` — `format:check` + `type-check` + `lint` + `test`. **Run this before opening a PR.**
- `pnpm build` — Vite bundle into each package's `dist/`.

A `prepare` (Husky) hook installs the git hooks. `pre-commit` runs `lint-staged` (prettier on changed files); `commit-msg` runs commitlint. If a hook fails, fix the issue and re-stage. **Don't `git commit --no-verify`** — fix the underlying problem, or fix the hook.

### Pull requests

Target `main`. Use the [PR template](.github/pull_request_template.md): Summary, Why, Test plan, Risk/rollback.

The PR title must be a [Conventional Commit](https://www.conventionalcommits.org/) (e.g. `feat: add foo`, `fix(core): handle empty state`). Why: PRs are squash-merged, so the title becomes the canonical commit on `main` and is what release-please reads when computing the next version. CI lints the PR title; a malformed title fails the `lint-pr-title` job.

Allowed scopes (free-form, but prefer): `core`, `dom`, `react`, `astro`, `examples`, `docs`, `ci`, `repo`.

CI runs:

- `lint-pr-title` — commitlint against your PR title.
- `verify` — `pnpm install --frozen-lockfile`, `pnpm verify`, `pnpm build`. **This is the required check on `main`.**

Wait for CI green before requesting merge.

### Releases

Fully automated via [release-please](https://github.com/googleapis/release-please) in **manifest mode** (one release PR per package). You don't run `npm version`, push tags, or edit `CHANGELOG.md`.

When a PR with a `feat:` or `fix:` title lands on `main`, release-please opens or updates a per-package release PR titled `chore(<package>): release X.Y.Z`. Squash-merging that PR creates a tag (e.g. `consent-core-v0.2.0`), which triggers `npm publish` for that package.

Bump rules:

- `feat:` → minor
- `fix:` → patch
- `feat!:` / `fix!:` / `BREAKING CHANGE:` in body → major
- `chore:`, `docs:`, `refactor:`, `ci:`, `build:`, `perf:`, `test:`, `style:` → no release on their own; included in the changelog when the next `feat:` / `fix:` triggers a release

If a change touches multiple packages, release-please bumps each independently based on the commit's scope. Use the scope to target one package: `feat(core): ...` only bumps `@privion-consent/core`. Without a scope, release-please applies the change to whichever packages it detects file changes in.

Internal `workspace:*` dependencies are auto-bumped via the `node-workspace` plugin: when `core` releases a new version, `dom` and `react` get a release PR pinning the new version.

#### Merge release PRs one at a time

When a `fix:` or `feat:` lands and triggers both a release PR for the changed package **and** a workspace-dep release PR for a downstream package (e.g. `consent-dom` fix → `consent-astro` patch via `node-workspace`), merge them **sequentially, waiting for each tag to appear** before merging the next. Don't squash-merge all open release PRs in a single sitting.

Why: if a workspace-dep release PR is merged before the upstream package is tagged, release-please re-evaluates on the next run, sometimes mis-identifies the workspace-dep merge commit as "not a release", walks back to the previous tag as the boundary, and produces a bogus follow-up release PR that re-attributes already-shipped feature commits to a new minor bump. That's how [`consent-astro@1.2.0`](packages/consent-astro/CHANGELOG.md) ended up superseding a phantom `1.1.1` with a misleading feature list ([#23](https://github.com/Dreher-Media/privion-consent/pull/23) → #24/#25/#26).

The safe order, every time:

1. Merge the upstream release PR (e.g. `chore(main): release consent-dom 1.0.1`).
2. Wait for the tag (`consent-dom-v1.0.1`) and the `Publish` workflow to complete.
3. Then merge the downstream workspace-dep release PR (e.g. `chore(main): release consent-astro 1.1.1`).

### What you don't need to do

- No manual version bumping.
- No tag pushing.
- No `CHANGELOG.md` edits (release-please owns it per-package).
- No `npm publish` from a laptop.
- No Changesets — this repo migrated off Changesets to release-please.

---

## Project metadata

- **Manifest:** [`.dm-standards.json`](./.dm-standards.json) — declares overlays (`typescript-node`, `public-package`) and visibility (`public`).
- **Required CI check on `main`:** `verify`.
- **Required secrets:** `NPM_TOKEN`, `RELEASE_PLEASE_TOKEN`.

This is a monorepo, which is currently a deviation from the standard `typescript-node` overlay (designed for single-package repos). Per-package CI/release/publish wiring is documented in this file rather than inherited until a `monorepo` overlay exists in the standards repo.

---

## Standards (internal)

These rules are documented in the private [`Dreher-Media/standards`](https://github.com/Dreher-Media/standards) repo. Links resolve for members of the Dreher-Media org; external contributors don't need them — the Quick start above covers everything you need to contribute.

- [`base/git-workflow.md`](https://github.com/Dreher-Media/standards/blob/main/base/git-workflow.md) — branch naming, when to PR, keeping branches current.
- [`base/commit-conventions.md`](https://github.com/Dreher-Media/standards/blob/main/base/commit-conventions.md) — Conventional Commits format, types, breaking changes.
- [`base/repo-configuration.md`](https://github.com/Dreher-Media/standards/blob/main/base/repo-configuration.md) — universal GitHub settings + ruleset.
- [`overlays/typescript-node/tooling.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/typescript-node/tooling.md) — local automation (Husky, lint-staged, the `verify` script).
- [`overlays/public-package/release-please.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/release-please.md) — the always-on release PR; gotchas around `RELEASE_PLEASE_TOKEN`.
- [`overlays/public-package/npm-publishing.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/npm-publishing.md) — tag-triggered publish; required secrets.
- [`overlays/public-package/semver-discipline.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/semver-discipline.md) — what counts as a breaking change for consumers.
- [`decisions/0003-public-repos-cannot-use-private-reusable-workflows.md`](https://github.com/Dreher-Media/standards/blob/main/decisions/0003-public-repos-cannot-use-private-reusable-workflows.md) — why this repo's configs and workflows are bundled inline rather than installed/referenced.

### Why bundled, not installed?

This repo is **public**. The standards configs (`@dreher-media/eslint-config`, `prettier-config`, etc.) live in a private GitHub Packages registry. Installing them in a public repo would require leaking auth into public CI logs and force external contributors to authenticate to install dev dependencies. So we bundle the relevant content inline — see `prettier.config.js`, `commitlint.config.cjs`, `eslint.config.js`, and `tsconfig.json` for the inline copies. They mirror the canonical sources in `Dreher-Media/standards/configs/`.

The same logic applies to GitHub Actions workflows — public repos cannot invoke private reusable workflows (this is a GitHub platform constraint, not a config issue). The workflows in `.github/workflows/` are kept inline and align with the canonical templates in `Dreher-Media/standards/templates/workflows/public-package/`.

When the canonical sources change, the inline copies must be updated manually until automated drift detection exists.
