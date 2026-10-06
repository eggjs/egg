---
title: Package release workflow
type: workflow
summary: Prepare package releases, preview version bumps and tarballs, and diagnose failures in the manual release workflow.
source_files:
  - .github/workflows/release.yml
  - scripts/version.js
  - scripts/publish.js
  - scripts/utils.js
  - scripts/test/release.test.js
  - AGENTS.md
updated_at: 2026-10-06
status: active
---

# Package release workflow

Use the **Manual Release** workflow in `.github/workflows/release.yml` to release the publishable packages declared in the root `package.json` workspaces. Versions are bumped independently from each package's current version; the root manifest and git tag use the resulting `egg` version. Private packages are excluded from the release set.

## Choose the release inputs

Set **Use workflow from** and the `branch` input to the same branch: `next` or `main`. The input defaults to `next` during the branch migration. The guard requires `github.ref` to equal `refs/heads/<branch>`, so tags and other branches (including `master`) are rejected. The guard does not inspect branch protection settings. The release job references the `release` environment, including for dry runs; its deployment branch policy must also allow the dispatch branch. Changing the workflow allowlist does not rename a branch or change the repository's default branch.

Choose `version_type` according to the intended result. `patch`, `minor` and `major` use the `latest` npm tag. `prerelease`, `prepatch`, `preminor` and `premajor` use the selected `prerelease_tag` (`alpha`, `beta` or `rc`). Check the per-package version plan rather than assuming all packages will receive the same version. For example, a patch bump takes `4.1.2-rc.0` to `4.1.2`, while `1.0.0` becomes `1.0.1`.

For a workflow preview, explicitly set `dry_run=true`; the input defaults to `false`. The preview computes the version plan, builds packages and runs npm's publishing dry-run. It skips release commits, tags, pushes and actual publication.

## Validate locally

Work in a clean checkout or a separate source copy. Run targeted tests before building, following [Local CI](./local-ci.md); generated `dist/` directories can affect tegg tests.

```bash
ut install
node --test scripts/test/release.test.js scripts/test/ci.test.js
node scripts/version.js patch --dry-run
ut run build
node scripts/publish.js --tag=latest --dry-run --version-type=patch
```

The two dry-run scripts serve different purposes. `version.js` prints the bump plan without writing manifests. `publish.js --version-type` projects those same versions into the temporary manifests used for packing, including resolved workspace dependency versions. It restores each original manifest after the npm invocation, whether that invocation succeeds or fails. This projection option is rejected without `--dry-run`.

To preview a prerelease, use matching inputs in both scripts:

```bash
node scripts/version.js prerelease --prerelease-tag=rc --dry-run
node scripts/publish.js --tag=rc --dry-run --version-type=prerelease --prerelease-tag=rc
```

Check that the projected versions and npm tag match the intended release, all packages pack successfully, declared entry files appear in the tarballs, and manifests remain unchanged. The regression tests use fake npm/git executables to test guards, command arguments and restoration; they do not replace real packing checks.

An offline npm preview can check local packing when registry access is unavailable, but cannot establish whether a version is already published or whether credentials work. Local checks also cannot establish that each package's npm trusted-publisher configuration matches the workflow or that `GIT_TOKEN` can push through branch protection. Verify those settings before a real workflow run.

## Understand a real run

With `dry_run=false`, the workflow detects an existing release at HEAD or bumps manifests and creates a version commit and tag. It then pushes the release commit/tags, builds packages, publishes through npm with provenance, creates a draft GitHub Release and synchronizes cnpm. Inspect individual step results: draft creation and cnpm synchronization can run after an earlier failure, so their presence alone does not prove publication succeeded.

The publish script resolves `workspace:` and `catalog:` dependencies and applies supported `publishConfig` entry overrides before each npm invocation. It rejects malformed names/versions and refuses prerelease versions targeting `latest` before invoking npm. Real npm publication forces notice logging.

The push happens before the build and npm publication. A failed run can therefore leave a pushed release tag and only some packages published. Treat the workflow as a sequence of recoverable steps, rather than an atomic transaction.

## Diagnose failures and retries

- **Release branch guard fails:** select the same allowed branch for the dispatch ref and the branch input. A same-named tag is not a branch.
- **Prerelease-to-latest guard fails:** inspect the versions and selected tag. For a stable-version preview against RC source manifests, include `--dry-run --version-type=patch`; do not disable the guard. Real publishing must use the bumped stable manifests.
- **Packing fails:** inspect the package's build output and npm error. Dry-run failures exit nonzero and are not retried. Rebuild or repair the package before repeating the preview.
- **Registry lookup warns:** a non-404 lookup failure is indeterminate. The script warns and continues with a publish attempt; the warning does not prove that the version is absent from npm.
- **Real publication fails partway through:** inspect the release commit, tag and npm versions before retrying with the same inputs. The workflow detects a version tag at HEAD or a release bump commit to skip another bump. The publish script skips versions it confirms already exist and retries failed packages once. Final unresolved failures exit nonzero. If HEAD has moved since the release attempt, check the intended release state before rerunning; retry detection examines HEAD.

Source references: [manual workflow](../../.github/workflows/release.yml), [version script](../../scripts/version.js), [publish script](../../scripts/publish.js), [manifest helpers](../../scripts/utils.js), and [release regression tests](../../scripts/test/release.test.js).
