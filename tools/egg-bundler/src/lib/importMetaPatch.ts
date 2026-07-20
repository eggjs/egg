// @utoo/pack (Turbopack) rewrites `import.meta` in bundled modules to a runtime
// shim that either throws or calls an undefined context method
// (`__turbopack_context__.F(...)`), so ANY bundled module using `import.meta.url`
// breaks at module evaluation — in Node and on Cloudflare workerd alike. This
// patches the emitted output to a working, self-locating implementation derived
// from `__filename` / `process.argv`, with a `"worker.js"` fallback for runtimes
// that have neither. Shared by the Node (Bundler) and standalone/worker targets.

const IMPORT_META_FALLBACK_FILENAME_EXPR = [
  '(() => {',
  'const entryArg = typeof process !== "undefined" && process.argv && process.argv[1] ? process.argv[1] : "worker.js";',
  'if (/^(?:[A-Za-z]:[\\\\/]|\\\\\\\\|\\/)/.test(entryArg)) return entryArg;',
  'const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : ".";',
  'const sep = cwd.includes("\\\\") ? "\\\\" : "/";',
  'const raw = cwd + sep + entryArg;',
  'const slash = raw.replace(/\\\\/g, "/");',
  'const root = /^[A-Za-z]:\\//.test(slash) ? slash.slice(0, 2) : slash.startsWith("//") ? "//" : slash.startsWith("/") ? "/" : "";',
  'const body = root && root !== "/" ? slash.slice(root.length + (root === "//" ? 0 : 1)) : slash;',
  'const parts = [];',
  'for (const part of body.split("/")) { if (!part || part === ".") continue; if (part === "..") parts.pop(); else parts.push(part); }',
  'return root === "/" ? "/" + parts.join("/") : root === "//" ? (sep === "\\\\" ? "\\\\\\\\" : "//") + parts.join(sep) : root ? root + sep + parts.join(sep) : parts.join(sep);',
  '})()',
].join(' ');

export const IMPORT_META_FILENAME_EXPR: string = `(typeof __filename === "string" ? __filename : ${IMPORT_META_FALLBACK_FILENAME_EXPR})`;

export const IMPORT_META_URL_EXPR: string = `(() => { const u = new URL("file:///"); u.pathname = ${IMPORT_META_FILENAME_EXPR}.replace(/\\\\/g, "/"); return u.href; })()`;

export const THROWING_IMPORT_META_URL: RegExp =
  /\(\(\)\s*=>\s*\{\s*throw\s+new\s+Error\(\s*['"][^'"]*import\.meta\.url[^'"]*['"]\s*\)\s*;?\s*\}\)\s*\(\)/g;

// Matches a single-getter object declaration `<kind> <ident> = { get url() { … } }`.
// The identifier is a plain `[\w$]*` (no embedded `import$2e$meta__` literal, whose
// word-chars would make the surrounding `[\w$]*` backtrack polynomially over a large
// bundle) and the getter body is `[^}]*` — both linear; the actual import.meta filter
// is `IMPORT_META_MARKER` in the replace callback.
export const TURBOPACK_IMPORT_META_OBJECT: RegExp =
  /\b(var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*get\s+url\s*\(\)\s*\{[^}]*\}\s*\};?/g;

/** Turbopack encodes `import.meta` as this variable-name marker (`.` → `$2e$`). */
const IMPORT_META_MARKER = 'import$2e$meta__';

export function renderImportMetaObject(declarationKind: string, metaName: string): string {
  return `${declarationKind} ${metaName} = (() => {
    const filename = ${IMPORT_META_FILENAME_EXPR};
    const dirname = (() => {
        const slashIndex = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\\\"));
        if (slashIndex > 2 || (slashIndex > 0 && !/^[A-Za-z]:[\\\\/]/.test(filename))) return filename.slice(0, slashIndex);
        if (slashIndex === 2 && /^[A-Za-z]:[\\\\/]/.test(filename)) return filename.slice(0, 3);
        if (slashIndex === 0) return filename[0];
        return ".";
    })();
    const url = (() => { const u = new URL("file:///"); u.pathname = filename.replace(/\\\\/g, "/"); return u.href; })();
    return {
    get url () {
        return url;
    },
    get dirname () {
        return dirname;
    },
    get filename () {
        return filename;
    }
};
})();`;
}

/** Replace Turbopack's broken import.meta shims in one emitted file's content. */
export function patchImportMetaInContent(content: string): { content: string; patchCount: number } {
  let metaMatches = 0;
  let patched = content.replace(TURBOPACK_IMPORT_META_OBJECT, (match, declarationKind: string, metaName: string) => {
    if (!metaName.includes(IMPORT_META_MARKER)) return match;
    metaMatches++;
    return renderImportMetaObject(declarationKind, metaName);
  });
  const urlMatches = patched.match(THROWING_IMPORT_META_URL);
  patched = patched.replace(THROWING_IMPORT_META_URL, IMPORT_META_URL_EXPR);
  return { content: patched, patchCount: (urlMatches?.length ?? 0) + metaMatches };
}
