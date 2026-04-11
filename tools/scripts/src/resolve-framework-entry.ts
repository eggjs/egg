import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve the framework's main entry file from its package.json.
 *
 * Supports multiple layouts:
 * - Worktree/monorepo: `src/index.ts` (preferred when present)
 * - Installed CJS: `dist/index.js` (via `main`)
 * - Installed ESM/dual: resolved via `exports['.']` (string or
 *   conditional, recursive pick of `import > node > default > require`)
 *
 * Returns the entry path plus a list of registry keys — the package
 * directory, the resolved entry file, and the entry's containing
 * directory — so runtime lookups by any of those paths resolve to the
 * same framework module.
 */
export function resolveFrameworkEntry(frameworkPath: string): { entryPath: string; registryKeys: string[] } {
  const keys: string[] = [frameworkPath];

  // Worktree/monorepo layout: prefer .ts source directly
  const srcEntry = path.join(frameworkPath, 'src/index.ts');
  if (existsSync(srcEntry)) {
    keys.push(srcEntry, path.join(frameworkPath, 'src'));
    return { entryPath: srcEntry, registryKeys: keys };
  }

  // Installed layout: read package.json
  const pkgPath = path.join(frameworkPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  let relEntry: string | undefined;
  const dotExport = pkg.exports?.['.'];
  if (typeof dotExport === 'string') {
    relEntry = dotExport;
  } else if (dotExport && typeof dotExport === 'object') {
    // conditional exports — try common conditions in priority order
    const pick = (v: unknown): string | undefined => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return pick(o.import) ?? pick(o.node) ?? pick(o.default) ?? pick(o.require);
      }
      return undefined;
    };
    relEntry = pick(dotExport);
  }
  relEntry ??= pkg.main ?? 'index.js';

  const entryPath = path.resolve(frameworkPath, relEntry as string);
  if (!existsSync(entryPath)) {
    throw new Error(
      `Framework entry not found: ${entryPath} (resolved from ${pkgPath}). ` +
        'Ensure the package is built and has a valid "main" or "exports" field.',
    );
  }
  keys.push(entryPath);
  const entryDir = path.dirname(entryPath);
  if (entryDir !== frameworkPath) keys.push(entryDir);

  return { entryPath, registryKeys: keys };
}
