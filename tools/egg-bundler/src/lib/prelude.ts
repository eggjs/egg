/**
 * Snapshot prelude generation.
 *
 * In snapshot mode the bundler prepends this prelude to the emitted single-file
 * `worker.js`, BEFORE the bundle IIFE (`((__UTOOPACK__)=>{...})([...modules])`),
 * so it runs before any bundled module is evaluated. It installs the
 * lazy-external / native-binding mechanism that keeps a V8 startup snapshot
 * serializable:
 *
 * 1. Node's web globals (fetch/Headers/.../File/Blob) are replaced with plain JS
 *    stubs so a bundled module touching them at evaluation time neither crashes
 *    (delete → ReferenceError) nor pulls in Node's built-in undici (whose llhttp
 *    HTTPParser / nghttp2 native bindings cannot be V8-snapshot-serialized).
 * 2. `node:buffer.File/Blob` getters are stubbed for the same reason (reading
 *    them lazily initializes the undici/http stack).
 * 3. Every external require is routed through `__makeLazyExt`, a member-proxy
 *    that returns a build-time stub and, at restore time, forwards to the real
 *    module via `globalThis.__RUNTIME_REQUIRE` — recording the access path so
 *    `class X extends pkg.Klass` / `DataTypes.INTEGER(11).UNSIGNED` keep working.
 *
 * The real globals/modules are present in the restored (live) process.
 */

import { promises as fs } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { debuglog } from 'node:util';

const debug = debuglog('egg/bundler/snapshot-prelude');

/**
 * Marker comment embedded in the prelude. Used to detect an already-prepended
 * prelude so {@link prependSnapshotPrelude} stays idempotent across re-runs.
 */
export const SNAPSHOT_PRELUDE_MARKER = '@eggjs/egg-bundler:snapshot-prelude';

/**
 * Node built-in modules that produce non-serializable native bindings when loaded
 * inside a V8 startup snapshot builder. They are kept as lazy externals: build time
 * returns a member-proxy stub; restore time forwards to the real module via
 * `globalThis.__RUNTIME_REQUIRE`.
 *
 * - network stack (HTTPParser, nghttp2, SecureContext, ChannelWrap):
 *   http/https/http2/tls/dns.
 * - `inspector`: a builtin would normally load for real at build (it is not a
 *   business package, so the `!isBuiltin` lazy condition does not catch it), but
 *   `egg` core does `import inspector from 'node:inspector'` and evaluates
 *   `inspector.url()` while building config — which initializes the CDP stack
 *   (readline/repl + http2 nghttp2 native), making the heap unserializable. Keep
 *   it lazy so the build-time stub is used; the live process gets the real module
 *   on restore.
 */
export const DEFAULT_SNAPSHOT_LAZY_MODULES: readonly string[] = [
  'http',
  'https',
  'http2',
  'node:http',
  'node:https',
  'node:http2',
  'tls',
  'node:tls',
  'dns',
  'node:dns',
  'inspector',
  'node:inspector',
];

/**
 * Node's web globals. They are backed by undici (fetch/Headers/Request/Response/
 * FormData/WebSocket/EventSource) or by node:buffer (File/Blob); touching the
 * undici-backed ones lazily initializes undici (llhttp HTTPParser + WebAssembly),
 * which the snapshot builder cannot serialize. They are replaced with build-time
 * stubs (NOT `delete`d — a deleted global throws ReferenceError when a bundled
 * module references it; a stub is referencable and harmless at build time).
 */
const WEB_GLOBALS: readonly string[] = [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'WebSocket',
  'EventSource',
  'MessageEvent',
  'CloseEvent',
  'File',
  'Blob',
];

/**
 * `node:buffer` is a real, serializable builtin (Buffer is needed at build time),
 * but reading its `File`/`Blob` getters lazily initializes Node's built-in undici
 * (→ http/http2 native bindings). Those two property getters are stubbed at build;
 * the live process re-exposes the real ones on restore.
 */
const BUFFER_DANGEROUS_PROPS: readonly string[] = ['File', 'Blob'];

interface AppPackageJson {
  readonly egg?: {
    readonly snapshot?: {
      readonly lazyModules?: unknown;
    };
  };
}

/**
 * Read `egg.snapshot.lazyModules` from the application `package.json` and merge it
 * (deduplicated, order-preserving) onto {@link DEFAULT_SNAPSHOT_LAZY_MODULES}.
 * Returns the default list unchanged when the field is absent or malformed.
 */
export async function resolveSnapshotLazyModules(baseDir: string): Promise<string[]> {
  const merged = [...DEFAULT_SNAPSHOT_LAZY_MODULES];
  const seen = new Set(merged);

  let pkg: AppPackageJson | undefined;
  try {
    const raw = await fs.readFile(path.join(baseDir, 'package.json'), 'utf8');
    pkg = JSON.parse(raw) as AppPackageJson;
  } catch (err) {
    debug('no readable package.json at %s: %s', baseDir, err instanceof Error ? err.message : err);
    return merged;
  }

  const extra = pkg?.egg?.snapshot?.lazyModules;
  if (!Array.isArray(extra)) return merged;

  for (const entry of extra) {
    if (typeof entry !== 'string' || entry.length === 0 || seen.has(entry)) continue;
    seen.add(entry);
    merged.push(entry);
  }
  debug('resolved %d snapshot lazy modules', merged.length);
  return merged;
}

/**
 * Render the snapshot prelude source. The result is plain CommonJS (the bundle
 * output package.json is `{ "type": "commonjs" }`) and must be safe to execute at
 * the very top of the worker file, before the bundle IIFE.
 *
 * http constants (METHODS/STATUS_CODES/maxHeaderSize) are read from the BUILD
 * Node here and inlined, instead of being hand-written — so they track the Node
 * version the bundle is built with and stay maintenance-free.
 */
export function renderSnapshotPrelude(
  lazyModules: readonly string[] = DEFAULT_SNAPSHOT_LAZY_MODULES,
  externalExports: Readonly<Record<string, readonly string[]>> = {},
): string {
  const lazyJson = JSON.stringify([...lazyModules]);
  const webJson = JSON.stringify([...WEB_GLOBALS]);
  const bufDangerJson = JSON.stringify([...BUFFER_DANGEROUS_PROPS]);
  const externalExportsJson = JSON.stringify(externalExports);
  const httpConstsJson = JSON.stringify({
    METHODS: http.METHODS,
    STATUS_CODES: http.STATUS_CODES,
    maxHeaderSize: http.maxHeaderSize,
  });

  return `// ⚠️ auto-generated by @eggjs/egg-bundler — snapshot prelude (do not edit)
// marker: ${SNAPSHOT_PRELUDE_MARKER}
// Runs before the bundle IIFE so it executes before any bundled module loads.
/* eslint-disable */
(function eggBundlerSnapshotPrelude() {
  'use strict';
  // Replace Node's web globals with a no-op stub CLASS (callable + constructable).
  // Why a stub class and not \`delete\`/\`undefined\`:
  //  - some bundled packages do \`class X extends globalThis.Request {}\`, which needs
  //    a constructable superclass — \`undefined\`/\`delete\` throws at class definition.
  //  - the stub is a no-op: it never touches the real fetch/Headers/..., so any
  //    feature-detect code that reads or calls it does nothing instead of
  //    initializing Node's undici stack (whose native bindings are unserializable).
  // The live process re-exposes the real globals on restore.
  var __WEB_GLOBALS = ${webJson};
  for (var __i = 0; __i < __WEB_GLOBALS.length; __i++) {
    try { Object.defineProperty(globalThis, __WEB_GLOBALS[__i], { value: function WebGlobalStub(){}, configurable: true, writable: true }); } catch (e) {}
  }

  if (globalThis.__LAZY_EXT) return;

  // Set of module ids treated as lazy externals (the patched externalRequire
  // forwards these to __makeLazyExt instead of loading the real module at build).
  globalThis.__LAZY_EXT = new Set(${lazyJson});

  // http constants captured from the build Node (no hand-written tables).
  globalThis.__HTTP_CONSTS = ${httpConstsJson};

  // External-package export names, read at build by the bundler. The member proxy
  // exposes these via ownKeys so @utoo/pack's interopEsm builds a full ESM
  // namespace and \`import { X } from 'pkg'\` resolves to a member-proxy (not undefined).
  globalThis.__EXTERNAL_EXPORTS = ${externalExportsJson};

  // node:buffer is real at build (Buffer is needed) but its File/Blob getters
  // trigger Node's built-in undici. Stub just those two; restore re-exposes them.
  (function () {
    try {
      var __buf = process.getBuiltinModule('node:buffer');
      var __bd = ${bufDangerJson};
      for (var __j = 0; __j < __bd.length; __j++) {
        try { Object.defineProperty(__buf, __bd[__j], { value: function BufStub(){}, configurable: true, writable: true }); } catch (e) {}
      }
    } catch (e) {}
  })();

  // isBuiltin: tells builtin "tool" modules (path/fs/module — load for real at
  // build) apart from non-builtin packages (lazy-stubbed at build).
  globalThis.__isBuiltin = (function () {
    try { return process.getBuiltinModule('node:module').isBuiltin; } catch (e) { return function () { return false; }; }
  })();

  globalThis.__makeLazyExt = function (id, thunk) {
    var realMod = function () { var rt = globalThis.__RUNTIME_REQUIRE; return rt ? rt(id) : undefined; };
    var EXPORTS = (globalThis.__EXTERNAL_EXPORTS && globalThis.__EXTERNAL_EXPORTS[id]) || [];
    var isHttp = id === 'http' || id === 'node:http' || id === 'https' || id === 'node:https';

    // A member-proxy records the access path (get/apply/construct + call args)
    // taken at build time and replays it against the real module on restore, so
    // e.g. \`class X extends urllib.HttpClient\` (build: stub superclass; restore:
    // real super()/methods) and \`DataTypes.INTEGER(11).UNSIGNED\` keep working.
    function makeMember(ops) {
      var resolve = function () {
        var v = realMod(), prev;
        for (var i = 0; i < ops.length; i++) {
          if (v == null) return undefined;
          var op = ops[i];
          if (op.t === 'g') { prev = v; v = v[op.k]; }
          else if (op.t === 'a') { v = (typeof v === 'function') ? v.apply(prev, op.args) : undefined; prev = undefined; }
          else if (op.t === 'c') { v = (typeof v === 'function') ? Reflect.construct(v, op.args) : undefined; prev = undefined; }
        }
        return v;
      };
      var protoProxy = new Proxy({}, { get: function (t, p) { var r = resolve(); return r && r.prototype ? r.prototype[p] : undefined; } });
      var member = new Proxy(function () {}, {
        get: function (t, p) { if (p === 'prototype') return protoProxy; var r = resolve(); if (r != null) return r[p]; if (p === 'then') return undefined; if (typeof p === 'symbol') return undefined; return makeMember(ops.concat([{ t: 'g', k: p }])); },
        apply: function (t, thisArg, args) { var r = resolve(); if (typeof r === 'function') return Reflect.apply(r, thisArg, args); return makeMember(ops.concat([{ t: 'a', args: args }])); },
        construct: function (t, args, nt) { var r = resolve(); if (typeof r === 'function') return Reflect.construct(r, args, nt || r); return makeMember(ops.concat([{ t: 'c', args: args }])); }
      });
      return member;
    }

    var proxy = new Proxy(function () {}, {
      get: function (target, prop) {
        if (prop === 'default') return proxy;
        var real = realMod();
        if (real != null) return real[prop];
        // Build-time http constants so a library iterating http.METHODS etc.
        // (e.g. \`for (const m of http.METHODS)\`) does not crash.
        if (isHttp && typeof prop === 'string' && globalThis.__HTTP_CONSTS && Object.prototype.hasOwnProperty.call(globalThis.__HTTP_CONSTS, prop)) return globalThis.__HTTP_CONSTS[prop];
        if (prop === '__esModule') return undefined;
        if (prop === 'then') return undefined;
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'prototype' || prop === 'name' || prop === 'length') return Reflect.get(target, prop);
        return makeMember([{ t: 'g', k: prop }]);
      },
      apply: function (target, thisArg, args) { var real = realMod(); if (typeof real === 'function') return Reflect.apply(real, thisArg, args); return undefined; },
      construct: function (target, args, nt) { var real = realMod(); if (typeof real === 'function') return Reflect.construct(real, args, nt || real); return Object.create((nt && nt.prototype) || target.prototype); },
      has: function (target, prop) { var real = realMod(); if (real != null) return prop in real; return true; },
      // Expose the external's real export names at build time (from
      // __EXTERNAL_EXPORTS, injected by the entry) so @utoo/pack's interopEsm —
      // which enumerates Object.getOwnPropertyNames(raw) — builds a full ESM
      // namespace whose named bindings each point at a member-proxy. Without this
      // \`import { HttpClient } from 'urllib'\` resolves to undefined.
      ownKeys: function (target) {
        var real = realMod();
        var base = (real != null) ? Reflect.ownKeys(real) : EXPORTS.slice();
        var tk = Reflect.ownKeys(target);
        for (var i = 0; i < tk.length; i++) if (base.indexOf(tk[i]) === -1) base.push(tk[i]);
        return base;
      },
      getOwnPropertyDescriptor: function (target, prop) {
        var td = Reflect.getOwnPropertyDescriptor(target, prop);
        if (td && !td.configurable) return td;
        var real = realMod();
        if (real != null) { var d = Reflect.getOwnPropertyDescriptor(real, prop); if (d) d.configurable = true; return d; }
        if (typeof prop === 'string' && EXPORTS.indexOf(prop) !== -1) return { value: makeMember([{ t: 'g', k: prop }]), configurable: true, enumerable: true, writable: true };
        return td;
      }
    });
    return proxy;
  };
})();
`;
}

/**
 * Prepend the snapshot prelude to `source`, preserving a leading shebang and a
 * leading `"use strict"` / `'use strict'` directive so neither is demoted out of
 * the directive prologue. Idempotent: if the prelude marker is already present the
 * source is returned unchanged.
 */
export function prependSnapshotPrelude(
  source: string,
  lazyModules: readonly string[] = DEFAULT_SNAPSHOT_LAZY_MODULES,
  externalExports: Readonly<Record<string, readonly string[]>> = {},
): string {
  // Only look for the marker in the file head (the prelude is short and always
  // sits at the very top). A whole-file `includes` would false-positive if any
  // bundled application/dependency code happened to contain the marker string,
  // silently skipping prelude injection.
  if (source.slice(0, 1024).includes(SNAPSHOT_PRELUDE_MARKER)) {
    return source;
  }

  const prelude = renderSnapshotPrelude(lazyModules, externalExports);
  const lines = source.split('\n');
  let insertAt = 0;

  // Keep a shebang on the very first line.
  if (lines[0]?.startsWith('#!')) {
    insertAt = 1;
  }
  // Keep a leading "use strict" directive ahead of the prelude.
  const directive = lines[insertAt]?.trim();
  if (directive === '"use strict";' || directive === "'use strict';") {
    insertAt += 1;
  }

  if (insertAt === 0) {
    return prelude + source;
  }
  const head = lines.slice(0, insertAt).join('\n');
  const tail = lines.slice(insertAt).join('\n');
  return `${head}\n${prelude}${tail}`;
}

/**
 * Read the export names of every external id (lazy network builtins + external
 * packages) from the BUILD process, so {@link renderSnapshotPrelude}'s member
 * proxy can present a full ESM namespace for `import { X } from 'pkg'`. Runs in
 * the bundler process (NOT the snapshot), so requiring a package here is harmless;
 * ids that cannot be required (e.g. a missing optional native binary) are skipped.
 */
export function readExternalExports(baseDir: string, ids: Iterable<string>): Record<string, string[]> {
  const req = createRequire(path.join(baseDir, 'package.json'));
  let isBuiltin: ((id: string) => boolean) | undefined;
  try {
    isBuiltin = (process.getBuiltinModule('node:module') as { isBuiltin?: (id: string) => boolean }).isBuiltin;
  } catch {
    isBuiltin = undefined;
  }
  const collect = (mod: unknown): string[] => {
    const set = new Set<string>();
    if (mod && (typeof mod === 'object' || typeof mod === 'function')) {
      for (const k of Object.keys(mod as object)) set.add(k);
      // CJS packages required as ESM expose named exports on `default`; merge them
      // (e.g. leoric's `DataTypes`/`Bone` only show up under default via import).
      const def = (mod as Record<string, unknown>).default;
      if (def && typeof def === 'object') for (const k of Object.keys(def)) set.add(k);
    }
    return [...set];
  };
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    try {
      const mod = isBuiltin?.(id)
        ? process.getBuiltinModule(id as Parameters<typeof process.getBuiltinModule>[0])
        : req(id);
      const names = collect(mod);
      if (names.length > 0) out[id] = names;
    } catch (err) {
      debug('skip external exports for %s: %s', id, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

/**
 * The source `@utoo/pack` (Turbopack) emits for its external-require helper. The
 * lazy hook is injected right after the opening brace, using the helper's own
 * parameter names so it stays correct even if Turbopack renames them.
 */
const EXTERNAL_REQUIRE_SIGNATURE =
  /function\s+externalRequire\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*(?:,[^)]*)?\)\s*\{/g;

export interface ExternalRequireInjectionResult {
  readonly content: string;
  readonly injected: number;
}

/**
 * Inject the lazy dispatch at the start of every `externalRequire` body:
 *
 * ```js
 * if (globalThis.__makeLazyExt && !globalThis.__RUNTIME_REQUIRE &&
 *     (globalThis.__LAZY_EXT.has(id) || !globalThis.__isBuiltin(id)))
 *   return globalThis.__makeLazyExt(id, thunk);
 * ```
 *
 * so at BUILD time a require is rerouted to {@link renderSnapshotPrelude}'s
 * `__makeLazyExt` when the id is a blacklisted network builtin OR a non-builtin
 * package (business deps must not be loaded/required for real at build — they may
 * be missing platform binaries or open connections). Builtin "tool" modules
 * (path/fs/module) stay real. At restore (`__RUNTIME_REQUIRE` installed) the hook
 * is a no-op and the real module is required.
 */
export function injectExternalRequireLazyHook(content: string): ExternalRequireInjectionResult {
  // Idempotent: a re-run over already-injected output must not double-inject the
  // dispatch. `__makeLazyExt(` only appears as the call site we inject (the prelude
  // *assigns* `__makeLazyExt =`, which has no `(`), so its presence means this file
  // was already processed.
  if (content.includes('globalThis.__makeLazyExt(')) {
    return { content, injected: 0 };
  }
  let injected = 0;
  const next = content.replace(EXTERNAL_REQUIRE_SIGNATURE, (match, idParam: string, thunkParam: string) => {
    injected++;
    return `${match} if (globalThis.__makeLazyExt && !globalThis.__RUNTIME_REQUIRE && (globalThis.__LAZY_EXT.has(${idParam}) || !globalThis.__isBuiltin(${idParam}))) return globalThis.__makeLazyExt(${idParam}, ${thunkParam});`;
  });
  return { content: next, injected };
}
