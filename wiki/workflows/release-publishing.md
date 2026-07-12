---
title: Release Publishing
type: workflow
summary: GitHub Release publishing uses the release tag as the egg version and needs one-time trusted-publisher setup for newly added npm packages.
source_files:
  - .github/workflows/release.yml
  - scripts/set-release-version.js
  - scripts/publish.js
  - pnpm-workspace.yaml
  - tegg/plugin/dns-cache/package.json
  - https://docs.npmjs.com/trusted-publishers/
  - https://docs.npmjs.com/cli/v11/commands/npm-trust/
updated_at: 2026-07-12
status: active
---

# Release Publishing

Releases run through `.github/workflows/release.yml` when a GitHub Release is published from the Releases page. The release tag must use the `v<semver>` form, for example `v4.1.2` or `v4.1.2-beta.17`, and represents the target `egg` and root monorepo version. The GitHub Release target must be a branch name, normally `next`, because the workflow pushes the generated version commit back to that branch.

The workflow checks out the GitHub Release target branch, installs with `ut install --from pnpm`, runs `scripts/set-release-version.js` to infer the semver bump from the current `egg` version to the tag version, applies that same bump type to each publishable workspace package, and sets the root version to the tag version. It then commits those version changes back to the release target branch, force-moves the GitHub Release tag to that version commit, builds with `ut run build`, and publishes with `node scripts/publish.js --tag=<npm-tag> --provenance`.

Because Egg packages use independent major versions, the release tag is not copied to every workspace package. For example, publishing `v4.1.2-beta.17` bumps `egg` to `4.1.2-beta.17`, but bumps `@eggjs/core` from `7.0.2-beta.16` to `7.0.2-beta.17`.

`scripts/publish.js` uses `pnpm --filter <package> publish` for each publishable package so workspace protocol references are handled by the package manager while npm provenance is enabled via `--provenance`. It skips versions that are already present on npm, publishes packages individually, and retries failures once. This makes a release retry-safe after a partial publish.

The npm dist-tag is `latest` for stable versions, the semver prerelease identifier for versions such as `4.1.2-alpha.0`, `4.1.2-beta.0`, or `4.1.2-rc.0`, and `beta` when the GitHub Release is marked as prerelease but the version has no semver prerelease identifier.

## New Packages

New public packages under an existing scope need one-time npm setup before the release workflow can publish them through trusted publishing. npm trusted publisher configuration requires the package to already exist on the npm registry, and the workflow can only exchange a GitHub Actions OIDC token for packages whose trusted publisher relationship is configured.

Inference: if a newly added workspace package fails with an OIDC token exchange `package not found` error and the registry also returns 404 for the package, the package likely has not been initialized on npm yet. First publish/create the package from a maintainer account with org publish rights, then configure trusted publishing for the package:

```bash
npm trust github <package-name> --repo eggjs/egg --file release.yml --allow-publish
```

After that, re-run the release workflow from GitHub Actions. Already-published packages should be skipped by `scripts/publish.js`, leaving only the newly initialized package to publish.
