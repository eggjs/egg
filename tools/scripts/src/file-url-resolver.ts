import { fileURLToPath } from 'node:url';

import type { Plugin as EsbuildPlugin } from 'esbuild';

/**
 * esbuild plugin: resolve `file://` URL imports to file paths.
 *
 * A generated bundle entry may emit `import * as mod from "file:///abs/path.ts"`
 * to disambiguate absolute paths. esbuild's default resolver does not
 * understand the `file://` protocol, so this plugin converts such
 * specifiers to absolute filesystem paths before esbuild resolves them.
 */
export function fileUrlResolverPlugin(): EsbuildPlugin {
  return {
    name: 'file-url-resolver',
    setup(build) {
      build.onResolve({ filter: /^file:\/\// }, (args) => ({
        path: fileURLToPath(args.path),
      }));
    },
  };
}
