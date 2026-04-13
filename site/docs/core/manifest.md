# Startup Manifest

Egg provides a startup manifest mechanism that caches file discovery and module resolution results to accelerate application cold starts.

## How It Works

Every time an application starts, the framework performs extensive filesystem operations:

- **Module resolution**: Hundreds of `fs.existsSync` calls probing `.ts`, `.js`, `.mjs` extensions
- **File discovery**: Multiple `globby.sync` scans across plugin, config, and extension directories
- **tegg module scanning**: Traversing module directories and `import()`-ing decorator files to collect metadata

The manifest mechanism collects these results on the first startup and writes them to `.egg/manifest.json`. Subsequent startups read from this cache, skipping redundant file I/O.

## Performance Improvement

Measured on cnpmcore in a container cold-start scenario (no filesystem page cache):

| Metric      | No Manifest | With Manifest | Improvement |
| ----------- | ----------- | ------------- | ----------- |
| App Start   | ~980ms      | ~780ms        | **~20%**    |
| Load Files  | ~660ms      | ~490ms        | **~26%**    |
| Load app.js | ~280ms      | ~150ms        | **~46%**    |

> Note: In local development, the OS page cache makes file I/O nearly zero-cost, so the improvement is negligible. The manifest primarily optimizes container cold starts and CI/CD environments without warm caches.

## Usage

### CLI Management (Recommended)

`egg-bin` provides a `manifest` command to manage the startup manifest:

#### Generate

```bash
# Generate for production
$ egg-bin manifest generate --env=prod

# Specify environment and scope
$ egg-bin manifest generate --env=prod --scope=aliyun

# Specify framework
$ egg-bin manifest generate --env=prod --framework=yadan
```

The generation process boots the app in `metadataOnly` mode (skipping lifecycle hooks, only collecting metadata), then writes the results to `.egg/manifest.json`.

#### Validate

```bash
$ egg-bin manifest validate --env=prod
```

Example output:

```
[manifest] Manifest is valid
[manifest]   version: 1
[manifest]   generatedAt: 2026-03-29T12:13:18.039Z
[manifest]   serverEnv: prod
[manifest]   serverScope:
[manifest]   resolveCache entries: 416
[manifest]   fileDiscovery entries: 31
[manifest]   extension entries: 1
```

If the manifest is invalid or missing, the command exits with a non-zero code.

#### Clean

```bash
$ egg-bin manifest clean
```

### Automatic Generation

After a normal startup, the framework automatically generates a manifest during the `ready` phase (via `dumpManifest`). On the next startup, if the manifest is valid, it is automatically used.

## Invalidation

The manifest includes fingerprint data and is automatically invalidated when:

- **Lockfile changes**: `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock` mtime or size changes
- **Config directory changes**: Files in `config/` change (MD5 fingerprint)
- **Environment mismatch**: `serverEnv` or `serverScope` differs from the manifest
- **TypeScript state change**: `EGG_TYPESCRIPT` enabled/disabled state changes
- **Version mismatch**: Manifest format version differs

When the manifest is invalid, the framework falls back to normal file discovery — startup is never blocked.

## Environment Variables

| Variable       | Description                  | Default                                               |
| -------------- | ---------------------------- | ----------------------------------------------------- |
| `EGG_MANIFEST` | Enable manifest in local env | `false` (manifest not loaded in local env by default) |

> Local development (`serverEnv=local`) does not load the manifest by default, since files change frequently. Set `EGG_MANIFEST=true` to force-enable.

## Deployment Recommendations

### Container Deployment

Generate the manifest in your Dockerfile after building:

```dockerfile
# Install dependencies and build
RUN npm install --production
RUN npm run build

# Generate startup manifest
RUN npx egg-bin manifest generate --env=prod

# Start the app (manifest is used automatically)
CMD ["npm", "start"]
```

### CI/CD Pipelines

Generate the manifest during the build stage and deploy it with the artifact:

```bash
# Build
npm run build

# Generate manifest
npx egg-bin manifest generate --env=prod

# Validate manifest
npx egg-bin manifest validate --env=prod

# Package (includes .egg/manifest.json)
tar -zcvf release.tgz .
```

## Important Notes

1. **Environment-bound**: The manifest is bound to `serverEnv` and `serverScope` (deployment type, e.g. `aliyun`). Different environments or deployment types require separate manifests.
2. **Regenerate after dependency changes**: Installing or updating dependencies changes the lockfile, which automatically invalidates the manifest.
3. **`.egg` directory**: The manifest is stored at `.egg/manifest.json`. Consider adding `.egg/` to `.gitignore`.
4. **Safe fallback**: A missing or invalid manifest causes the framework to fall back to normal discovery — startup is never broken.
5. **metadataOnly mode**: `manifest generate` does not run the full application lifecycle — no database connections or external services are started.
