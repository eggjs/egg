---
title: Secure release pipeline
type: decision
summary: Target design for hardening the npm release pipeline — GitHub-Release-triggered publish, Environment-gated with a second-person approval, OIDC/provenance pinned to the workflow+environment, build/publish privilege split, and a GitHub App token replacing the long-lived PAT. P0 script/workflow hardening landed in #6017.
source_files:
  - .github/workflows/release.yml
  - scripts/version.js
  - scripts/publish.js
  - scripts/utils.js
  - scripts/sync-cnpm.js
updated_at: 2026-06-28
status: active
---

# Secure release pipeline

Decision record for hardening the eggjs/egg npm release pipeline. Produced from a
multi-agent design pass (three candidate architectures, each red-teamed, then
synthesized). The maintainer chose a **GitHub-Release-triggered** target model.

## Context

### Current pipeline (as-is, before this work)

`.github/workflows/release.yml` is a single `workflow_dispatch` job that, with
`permissions: contents:write packages:write id-token:write`, checks out
`inputs.branch` (a free-form string) using a `GIT_TOKEN` PAT, then runs version
bump → `git push origin <branch> --tags` → `ut run build` →
`node scripts/publish.js --provenance` (npm OIDC trusted publishing) → draft
GitHub Release → `sync-cnpm.js`. All steps run in one job with every secret
present throughout.

### Threat model (anchor)

- **Not externally exploitable.** `workflow_dispatch` requires repo _write_
  access; fork PRs get no secrets.
- **Real threats:** (a) compromised maintainer account or leaked `GIT_TOKEN`
  PAT; (b) social engineering ("test-release my branch"); (c) accidental
  wrong-branch / wrong-version publish.
- **Amplifier:** provenance/OIDC means a malicious artifact gets a _genuine_
  provenance attestation — publishing arbitrary branch code as "official, signed"
  egg packages is the worst case.

### Weaknesses

- **W1** `inputs.branch` is unconstrained → any ref can be checked out, pushed
  to, and published.
- **W2** The dispatch ref (workflow definition) and `inputs.branch` (code) can
  differ → reviewing `release.yml` does not tell you what code ships.
- **W3** One job runs arbitrary install/build/publish code _with_ the npm OIDC
  credential and the PAT present → no privilege separation.
- **W4** `GIT_TOKEN` is a long-lived broad PAT (vs an ephemeral token).
- **W5** No second-person approval before npm publish.

## Decision

Move to a **two-workflow, GitHub-Release-triggered, Environment-gated** pipeline:

1. **`release-prepare.yml`** (`workflow_dispatch`): bump versions, create a
   **signed** commit + tag pushed to a protected branch via a short-lived GitHub
   App token, and open a **draft** GitHub Release. No publish, no OIDC.
2. A maintainer reviews and **publishes** the draft Release. That deliberate,
   audited action is the trigger.
3. **`release.yml`** (`on: release: [published]`): `guard` → `build` (zero-secret)
   → `publish` (Environment-gated, OIDC-only, manifests re-derived from source)
   → `finalize`.

Chosen over the dispatch-driven and release-PR alternatives because `on: release`
makes review-integrity automatic (see below) while keeping egg's prerelease/retry
UX and the existing `version.js` / `publish.js` scripts largely intact.

## Verified GitHub-behavior facts (load-bearing)

- For the **`release`** event, the workflow YAML is read from the **default
  branch**, and `GITHUB_SHA` is the tagged release's commit, `GITHUB_REF` is
  `refs/tags/<tag>`. Source: GitHub docs, "Events that trigger workflows". This
  means the publish logic can **not** be swapped via a crafted tag/release — it
  is always the reviewed default-branch version (closes W2 by construction).
- egg's **default branch is `next`** (`gh api repos/eggjs/egg --jq .default_branch`),
  so `release.yml` must live on `next`, and the version bump/tag land on `next`.
- `workflow_dispatch` **`choice` inputs are NOT enforced for API-triggered
  dispatches** (only the UI dropdown validates). So an in-workflow guard step
  re-validating the value is load-bearing, not cosmetic. Source: GitHub
  changelog "Input types for manual workflows" + community confirmation.
- A GitHub Release can be created pointing at **any** commit, so the `guard` must
  verify `GITHUB_SHA` is reachable from a protected branch.

## Architecture

```
release-prepare.yml  (workflow_dispatch, from next/master)
  bump   install (NO token) → version.js (manifests only) → upload bumped tree
  push   download tree → mint GitHub App token → signed commit + signed tag
         → push to next → create DRAFT GitHub Release        [no 3rd-party code]

         ── maintainer reviews & PUBLISHES the draft Release ──►

release.yml  (on: release: [published]; workflow read from `next`)
  guard    contents:read   no secrets   → GITHUB_SHA is ancestor of next/master?
           tag == egg version? derive npm_tag from semver (prerelease⇒beta/…,
           else latest); fail-closed on mismatch
  build    contents:read   NO secrets, NO id-token
           ut install (frozen) → ut run build → emit dist digest
  publish  environment:npm-release   id-token:write only   ← REQUIRED-REVIEWER GATE
           download artifact + verify digest == build output
           checkout GITHUB_SHA source; re-derive manifests from SOURCE
           publish.js --provenance  (npm publish, --ignore-scripts in P1)
  finalize contents:read (+ App token, no OIDC) → undraft/notes + sync-cnpm
```

### Per-job permissions & secret exposure

| Job          | `permissions`                       | Secrets             | Runs 3rd-party code?           |
| ------------ | ----------------------------------- | ------------------- | ------------------------------ |
| prepare/bump | `contents: read`                    | none                | yes (`ut install`)             |
| prepare/push | `contents: read`                    | App key → ≤1h token | no (git only)                  |
| guard        | `contents: read`                    | none                | no                             |
| build        | `contents: read`                    | **none**            | yes (install+build)            |
| publish      | `id-token: write`, `contents: read` | **OIDC only**       | no (`npm publish`)             |
| finalize     | `contents: read`                    | App token           | github-script + tokenless sync |

The npm trusted publisher is pinned to `repository=eggjs/egg` **AND**
`workflow=.github/workflows/release.yml` **AND** `environment=npm-release`. The
environment claim is the keystone: a token can only be minted by a run that
passed the required-reviewer gate.

## Threat-coverage matrix

| ID  | Weakness / threat                   | How the target design closes it                                                                                                                          | Residual risk                                                                                                                                                       |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Any ref releasable                  | release can point at any commit → `guard` requires `GITHUB_SHA` reachable from `next`/`master`; npm won't mint a token outside `release.yml`+environment | admin edits guard/allowlist (covered by CODEOWNERS)                                                                                                                 |
| W2  | Review ≠ what ships                 | `on: release` reads the workflow from the **default branch** (always the reviewed one); code checked out is the tagged `GITHUB_SHA`                      | `dist/` is built post-tag — see W3                                                                                                                                  |
| W3  | One job holds OIDC + arbitrary code | build (no secrets) → publish (OIDC only, no `ut`/build, manifests re-derived from source)                                                                | poisoned build dependency can corrupt `dist/` → signed; mitigated by `--ignore-scripts` + frozen lockfile + digest pin; full closure needs reproducible builds (P2) |
| W4  | Long-lived PAT                      | GitHub App token (≤1h, `contents:write` only), minted only in the push/finalize steps, never co-resident with 3rd-party code; delete `GIT_TOKEN`         | leaked App key mints ≤1h `contents:write` but **cannot publish**                                                                                                    |
| W5  | No second person                    | publishing the draft Release is one gate; `environment: npm-release` required reviewers (prevent-self-review, reviewer ≠ releaser) is the second         | two colluding/compromised maintainers; admin Environment bypass                                                                                                     |
| (c) | Accidental wrong version            | npm dist-tag derived from the version's semver, fail-closed; prerelease→`latest` refused in `publish.js`                                                 | reviewer rubber-stamps                                                                                                                                              |

## Script-level hardening (independent of topology)

Found by the red-team; landed as **P0** in
[#6017](https://github.com/eggjs/egg/pull/6017):

- `version.js` built the release commit via `execSync(\`git commit -m "${msg}"\`)`with package names interpolated → **shell-injection sink**. Fixed with`execFileSync` argv + npm-name validation.
- `publish.js` `isPublished()` swallowed _all_ errors (network/5xx ⇒ "not
  published"). Now distinguishes a real 404 from indeterminate errors (warns).
- `publish.js` real-publish logging forced to `notice` (was `verbose`) to avoid
  surfacing auth headers in CI logs.
- `publish.js` rejects malformed package names and refuses to publish a
  prerelease version to the `latest` dist-tag.
- `release.yml` `branch` input constrained to `next`/`master` + a runtime guard
  (dispatch ref == release branch).

Still **deferred to P1**: `npm publish --ignore-scripts` — unsafe today because
`@eggjs/egg-bundler` has `prepublishOnly: npm run build`; belongs with the
build/publish split where `dist/` is pre-built and digest-verified.

## Supporting config

| Area                              | Setting                                                                                                        | Where          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| npm trusted publisher (×79)       | repo + `release.yml` + environment `npm-release`; remove any static `NPM_TOKEN` fallback                       | npm            |
| Environment `npm-release`         | required reviewers; prevent-self-review ON; reviewer ≠ releaser; deployment branches `next`/`master`           | repo settings  |
| Branch protection `next`/`master` | required review; include administrators; signed commits; direct push only by the App                           | repo settings  |
| CODEOWNERS                        | `/.github/`, `/scripts/`, `pnpm-workspace.yaml` → release owners                                               | repo file      |
| Tag protection                    | `refs/tags/v*`: only the release App creates; no force-update/delete                                           | repo settings  |
| Token (W4)                        | GitHub App, `contents: write`; `actions/create-github-app-token`; delete `GIT_TOKEN` PAT                       | repo/org       |
| Action pinning                    | SHA-pin `create-github-app-token`, `upload/download-artifact`; verify `setup-utoo`; checksum the `ut` download | workflow files |
| Runners                           | GitHub-hosted only; no self-hosted for release                                                                 | org/repo       |

## Phased migration

- **P0 (done — [#6017](https://github.com/eggjs/egg/pull/6017))** — code/workflow
  hardening above; no infra changes.
- **P1 (structural)** — GitHub App + delete PAT; split build→publish with digest
  verification + `--ignore-scripts`; `environment: npm-release` with required
  reviewers; npm trusted-publisher pinned; switch to `on: release` trigger +
  `release-prepare.yml`; CODEOWNERS + enforce-admins + signed commits/tags.
- **P2 (depth)** — split `release-prepare` so `ut install` never co-resides with
  the App token; `actions/attest-build-provenance` + reproducible-build diff
  (closes the W3 residual); pin/checksum the toolchain; periodic out-of-band
  audit of the npm trusted-publisher config.

## Decisions taken

| Decision                  | Choice                                                   | Rationale                                                                                                            |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Trigger model             | **GitHub Release (`on: release`)**                       | Workflow read from default branch ⇒ review-integrity is automatic; publishing the Release is an auditable human gate |
| Token                     | **GitHub App** (replace `GIT_TOKEN` PAT)                 | Ephemeral per-run vs standing broad credential                                                                       |
| Manifest rewrite location | **re-derive in `publish` from `GITHUB_SHA` source**      | a poisoned build artifact must not be able to rewrite `dependencies`/`exports` post-review                           |
| `master` in allowlist     | keep **only** if it has identical protection + reviewers | weakest allowlisted branch sets the floor                                                                            |
| Reproducible builds       | accept residual now, schedule P2                         | high-effort for 79 packages; mitigate with `--ignore-scripts` + frozen lockfile + digest first                       |

## Related

- [[local-ci]] — release runs build then tests; this design keeps build in a
  zero-secret job.
- npm publish protocol/`publishConfig` handling: see #6016 (the npm-switch this
  builds on).
