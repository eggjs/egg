---
title: PR Preview Packages
description: Install and test Egg packages from a pull request before an npm release.
---

# PR Preview Packages

Preview packages let you test a fix or feature from an Egg pull request before its npm release.
You install them from `pkg.pr.new` URLs with your application's package manager.

::: warning Preview packages expire
According to [StackBlitz's retention policy](https://blog.stackblitz.com/posts/cloudflare-backing-pkg-pr-new-data-infrastructure/), published on June 4, 2025, a package is automatically removed when either condition applies:

- It has no downloads for more than one month.
- It is more than six months old, regardless of download activity.

A commit-SHA URL or lockfile does not prevent removal. Use previews for temporary testing and npm releases for lasting dependencies.
If a preview expires, ask a maintainer to publish a new preview, then update the URL and lockfile.
:::

## Find a Preview

1. Open the pull request that contains the change you want to test.
2. If no preview is available, ask a maintainer to add the `pkg.pr.new` label.
3. Wait for `Publish PR Preview` to succeed, then find the package URLs in the `pkg.pr.new` bot comment.

New commits publish again while the label remains attached.
Run the installation commands in your application directory. You do not need to install the publishing CLI.

## Install Packages

Use your application's package manager, and replace `<ref>` below with a published PR number or commit SHA.

With npm:

```bash
npm install "https://pkg.pr.new/eggjs/egg/egg@<ref>"
npm install --save-dev "https://pkg.pr.new/eggjs/egg/@eggjs/mock@<ref>"
```

With pnpm:

```bash
pnpm add "https://pkg.pr.new/eggjs/egg/egg@<ref>"
pnpm add --save-dev "https://pkg.pr.new/eggjs/egg/@eggjs/mock@<ref>"
```

Install the packages you need. Keep runtime packages in `dependencies` and test tools in `devDependencies`.
Package names and imports stay the same; the dependency declarations now contain preview URLs.
Run your application's tests after installation.

## Choose a PR or Commit

- A PR-number URL follows the latest successful preview for that PR.
- A commit-SHA URL selects a specific published commit. Copy it from the workflow's `Publish previews` logs for reproducible tests.

A lockfile can retain an older download for a PR-number URL. To test a new commit, install its SHA URL and update the lockfile.
Keep the dependency declaration and lockfile together when sharing the test setup.
Include the commit SHA when reporting test results on the pull request.

Preview packages retain their source version number, so use the URL and commit SHA to identify the tested build.
See [pkg.pr.new URL and version options](https://github.com/stackblitz-labs/pkg.pr.new#url-and-version-options) for details.

## Use Related Packages

For other packages, such as `@eggjs/bin` or `@eggjs/tegg`, copy their URLs from the same publication.
Runtime dependencies between published workspace packages already point to previews from the same commit.
Other direct dependencies in your application keep their existing declarations until you update them.

## Return to Regular Releases

After testing, restore the dependency declarations and lockfile entries from before the preview installation.
Run your application's normal dependency install command, then check that the preview URLs you added are gone from both files.
