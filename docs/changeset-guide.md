# Changeset Guide for Egg.js Monorepo

This document explains how to use changesets for version management and releasing packages in the Egg.js monorepo.

## What are Changesets?

Changesets is a tool designed for managing versions and changelogs in multi-package repositories (monorepos). It allows you to:

- Track which packages need to be released
- Version packages independently instead of bulk releases
- Generate changelogs automatically
- Publish only the packages that have changed

## Basic Workflow

### 1. Making Changes

When you make changes to packages in the monorepo that should be released:

```bash
# Create a changeset describing your changes
pnpm changeset
```

This will:

1. Prompt you to select which packages have changed
2. Ask for the version bump type (major, minor, or patch) for each package
3. Prompt you to write a summary of the changes
4. Create a markdown file in `.changeset/` with your changeset information

### 2. Changeset Types

When creating a changeset, you'll need to specify the version bump type:

- **major**: Breaking changes (e.g., `1.0.0` → `2.0.0`)
- **minor**: New features, backwards compatible (e.g., `1.0.0` → `1.1.0`)
- **patch**: Bug fixes, backwards compatible (e.g., `1.0.0` → `1.0.1`)

### 3. Committing Changesets

Commit the generated changeset files along with your code changes:

```bash
git add .changeset/
git commit -m "feat: add new feature"
```

### 4. Automated Release Process

Once your PR is merged to the `next` branch:

1. The GitHub Actions workflow automatically runs
2. If changesets exist, it creates a "Version Packages" PR
3. The Version Packages PR will:
   - Update package versions based on changesets
   - Update CHANGELOG.md files
   - Remove consumed changesets
4. When you merge the Version Packages PR, packages are automatically published to npm

## Manual Commands

### Creating a Changeset

```bash
pnpm changeset
```

### Versioning Packages (Local Testing)

```bash
# This updates package.json versions and CHANGELOGs
pnpm run changeset:version
```

### Publishing Packages (Manual)

```bash
# Build and publish changed packages
pnpm run changeset:publish
```

## Advanced Usage

### Snapshot Releases

For testing purposes, you can create snapshot releases:

```bash
pnpm changeset version --snapshot
pnpm changeset publish --tag snapshot
```

### Prereleases

To create prerelease versions:

```bash
# Enter prerelease mode
pnpm changeset pre enter beta

# Create changesets as usual
pnpm changeset

# Version and publish
pnpm run changeset:version
pnpm run changeset:publish

# Exit prerelease mode
pnpm changeset pre exit
```

## Configuration

The changeset configuration is in `.changeset/config.json`:

```json
{
  "baseBranch": "next",
  "access": "public",
  "ignore": ["@eggjs/monorepo", "helloworld-*", "site"]
}
```

- `baseBranch`: The main branch for releases (set to `next`)
- `access`: Package publish access level (set to `public`)
- `ignore`: Packages that should never be published

## Best Practices

1. **Create changesets with your PR**: Always create a changeset when making changes that should be released
2. **Write clear summaries**: The changeset summary becomes part of the changelog
3. **Choose the correct bump type**: Follow semantic versioning principles
4. **Review the Version PR**: Check the Version Packages PR before merging to ensure versions are correct
5. **One changeset per feature**: Create separate changesets for different features or fixes

## Comparison with Old Version Script

### Old Method (scripts/version.js)

- Bumped **all** package versions at once
- Required manual execution
- No automatic changelog generation
- All-or-nothing release approach

### New Method (Changesets)

- Version **only changed** packages
- Automatic PR creation
- Automatic changelog generation
- Selective package releases
- Better tracking of what changed and why

## Troubleshooting

### No changeset detected

If you forgot to create a changeset:

```bash
pnpm changeset
```

### Wrong version bump

If you need to change a changeset:

1. Delete the changeset file in `.changeset/`
2. Create a new one with `pnpm changeset`

### Failed publish

Check the GitHub Actions logs for details. Common issues:

- NPM authentication problems
- Build failures
- Network issues

## Migration Notes

The old version management scripts (`scripts/version.js`) are kept for backward compatibility and emergency use. However, **changesets should be the primary method** for version management going forward.

To gradually migrate:

1. Start using changesets for new changes
2. Create changesets in all new PRs
3. Let the automated workflow handle versioning and publishing
4. Eventually deprecate the old scripts once the team is comfortable with changesets

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Adding a Changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md)
- [Changesets CLI](https://github.com/changesets/changesets/blob/main/packages/cli/README.md)
