---
title: Secure release pipeline
type: decision
summary: Local PR 6017 integration guards release refs and npm tags while preserving RC-to-stable previews.
source_files:
  - .github/workflows/release.yml
  - scripts/version.js
  - scripts/publish.js
  - scripts/utils.js
  - scripts/test/release.test.js
updated_at: 2026-10-06
status: active
---

# Secure release pipeline

PR 6017 has been integrated locally against `next`; this does not mean the PR has merged. Index and log conflicts are resolved by retaining current entries and adding this record. The original PR's future pipeline proposal is not presented as implemented architecture.

`version.js` passes git commands and multiline commit messages through `execFileSync` argument arrays, validating package names before manifest changes. The release workflow allows `next` and `master` and requires the dispatch ref to equal `refs/heads/<branch>`; same-named tags are rejected. This allowlist does not verify GitHub branch protection settings.

`publish.js` rejects invalid package names/versions and prereleases targeting `latest` before invoking npm. Registry errors other than 404 produce warnings and still permit publishing under the existing retry policy. Real publishing uses notice logging.

Dry-run-only `--version-type` projects semver versions and workspace dependency ranges before packing. RC `4.1.2-rc.0` projects to stable `4.1.2` with `patch`. The tag guard validates projected versions; without projection, RC-to-latest remains rejected even in dry-run. Real publishing rejects this projection option. Source manifests are restored in `finally`, including on packing failures.

Validation: `node --test scripts/test/release.test.js scripts/test/ci.test.js`. Tests execute the workflow guard and temporary fixture scripts with fake npm/git executables, checking arguments, projected manifests, dependencies and restoration. They do not publish, create real commits/tags or verify complete built tarballs. `node scripts/version.js patch --dry-run` separately validates the current workspace's version plan.

The workflow still pushes tags before npm publication and is not atomic. Package OIDC configuration and protected-branch token permissions require operational verification before release. The workflow defaults to a real run; previews must explicitly set `dry_run=true`.

## Local verification on 2026-10-06

- Ten targeted release/CI tests passed on Node 22.22.2 and 26.1.0.
- The complete `ut run build` passed in a temporary source copy using Node 26.1.0 and npm 11.13.0. npm used a writable temporary cache; initial default-cache access failed under the local sandbox.
- Real `publish.js --tag=latest --dry-run --version-type=patch` passed for all 85 publishable packages with npm offline mode. All 85 reported stable versions and public/latest dry-run packing. This did not verify registry version availability, authentication or OIDC.
- All 85 actual npm tarballs were inspected: projected versions matched, workspace/catalog protocols were resolved and all declared exports/main/module/types/typings/bin targets existed (including wildcard matches). No missing targets were found. This checks package structure rather than runtime behavior for every package.
- All 1099 manifests in the temporary source copy matched their pre-preview SHA-256 hashes after publishing previews and tarball inspection. Original user docs/navigation changes remained byte-for-byte unchanged.
- Direct latest publishing with the current RC manifests was rejected by preflight validation before invoking npm. No real publishing, commit, push or workflow dispatch occurred. The release workflow's Node 24 environment remains untested locally.
