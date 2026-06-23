import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Plugin as EsbuildPlugin } from 'esbuild';

/**
 * Pure transformation for ESM polyfill. Exported for unit testing.
 *
 * Returns the modified source, or `null` if the file is CJS (no ESM
 * markers), if the file declares `__dirname` at top-level, or if no
 * substitutions were needed. Detects ESM by presence of `import.meta.`
 * or a top-level `import`/`export` statement — CJS files (e.g. files
 * using `module.exports` and `require`) are left untouched.
 *
 * Replacements:
 * - `import.meta.dirname`/`url`/`filename` → literal strings baked at
 *   build time using the original source path
 * - `__dirname` → literal absolute dirname of the original source
 *
 * Deliberately does NOT touch `__filename`: ESM sources often contain
 * `const __filename = fileURLToPath(import.meta.url)` as a CJS-compat
 * fallback (e.g. koa-onerror), and literal substitution would turn the
 * declaration into `const "/path" = ...` (syntax error). Because
 * `__filename` is never substituted, a local `__filename` declaration
 * is already safe and does NOT need to trigger opt-out.
 *
 * The opt-out check is top-level only: `@cnpmjs/packument` uses
 * `const __dirname = new URL('.', import.meta.url).pathname` at module
 * top-level, which is what we need to skip. Restricting to top-level
 * (no leading whitespace) means nested-scope declarations — e.g.
 * koa-onerror's function-body `  const __filename = fileURLToPath(...)`
 * — don't accidentally opt out the whole file and lose the critical
 * `__dirname` substitution in their CJS-compat branch.
 */
export function applyEsmPolyfill(contents: string, absPath: string): string | null {
  const isESM = contents.includes('import.meta.') || /^(?:import|export)\s/m.test(contents);
  if (!isESM) return null;

  // Skip files that declare __dirname at top level — substituting the
  // LHS of the declaration would produce `const "/path" = ...`. Only
  // __dirname is substituted below, so only __dirname declarations
  // need to opt out; __filename is left untouched unconditionally.
  if (/^(?:const|let|var)\s+__dirname\b/m.test(contents)) {
    return null;
  }

  const dirname = path.dirname(absPath);
  const url = pathToFileURL(absPath).href;

  const modified = contents
    .replace(/\bimport\.meta\.dirname\b/g, JSON.stringify(dirname))
    .replace(/\bimport\.meta\.url\b/g, JSON.stringify(url))
    .replace(/\bimport\.meta\.filename\b/g, JSON.stringify(absPath))
    .replace(/\b__dirname\b/g, JSON.stringify(dirname));

  return modified === contents ? null : modified;
}

/**
 * esbuild plugin: polyfill ESM-only constructs (`import.meta.*`,
 * `__dirname`) for CJS bundle output. See {@link applyEsmPolyfill}.
 */
export function esmPolyfillPlugin(): EsbuildPlugin {
  return {
    name: 'esm-polyfill',
    setup(build) {
      build.onLoad({ filter: /\.(ts|js|mjs|cjs)$/ }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        const modified = applyEsmPolyfill(contents, args.path);
        if (modified === null) return null;

        const ext = path.extname(args.path);
        const loader = ext === '.ts' ? ('ts' as const) : ('js' as const);
        return { contents: modified, loader };
      });
    },
  };
}
