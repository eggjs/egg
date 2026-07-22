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
 * Modules that produce non-serializable native bindings when loaded inside a V8
 * startup snapshot builder. They are kept as lazy externals: build time returns a
 * member-proxy stub; restore time forwards to the real module via
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
 * - `undici` / `urllib`: egg's HTTP client stack, built during boot
 *   (`class HttpClient extends urllib.HttpClient`, and urllib's own
 *   `class BaseAgent extends undici.Agent`). undici instantiates an llhttp
 *   `WebAssembly` module (disabled under `--build-snapshot`) + an `HTTPParser`, so
 *   it must not be evaluated at build. Unlike the builtins above these are npm
 *   packages that would otherwise be **inlined** into the bundle and evaluated at
 *   build; listing them here forces them external (see {@link Bundler}) so the
 *   member-proxy stub is used at build and the real module is required on restore.
 *   Listing them by default means an app gets a serializable snapshot without
 *   adding them to `egg.snapshot.lazyModules` itself.
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
  'undici',
  'urllib',
];

/**
 * Node's web globals. They are backed by undici (fetch/Headers/Request/Response/
 * FormData/WebSocket/EventSource) or by node:buffer (File/Blob); touching the
 * undici-backed ones lazily initializes undici (llhttp HTTPParser + WebAssembly),
 * which the snapshot builder cannot serialize. They are replaced with build-time
 * stubs (NOT `delete`d — a deleted global throws ReferenceError when a bundled
 * module references it; a stub is referencable and harmless at build time).
 */
const UNDICI_WEB_GLOBALS: readonly string[] = [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'WebSocket',
  'EventSource',
  'MessageEvent',
  'CloseEvent',
];

/** Web globals provided by `node:buffer`; re-installed from that builtin on restore. */
const BUFFER_WEB_GLOBALS: readonly string[] = ['File', 'Blob'];

const WEB_GLOBALS: readonly string[] = [...UNDICI_WEB_GLOBALS, ...BUFFER_WEB_GLOBALS];

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
  const undiciGlobalsJson = JSON.stringify([...UNDICI_WEB_GLOBALS]);
  const bufferGlobalsJson = JSON.stringify([...BUFFER_WEB_GLOBALS]);
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
  // Neutralize Node's undici-backed web globals (fetch/Headers/Request/...) so they
  // never lazily initialize Node's undici stack (llhttp HTTPParser + nghttp2), whose
  // native bindings a V8 startup snapshot cannot serialize.
  //
  // This MUST be done in two passes:
  //  1. delete the global first. Node defines these as lazy accessor properties; a
  //     plain redefine via Object.defineProperty (e.g. of \`Headers\`) makes Node load
  //     undici → http2 native eagerly — the exact thing we must avoid. \`delete\`
  //     removes the lazy getter WITHOUT triggering it.
  //  2. then install a no-op stub CLASS as a plain data property. It is now safe (no
  //     lazy getter remains to trigger) and constructable, so a bundled package doing
  //     \`class X extends globalThis.Request {}\` still works (\`delete\`/\`undefined\`
  //     alone would throw "Class extends value undefined" at class definition).
  // The live process re-exposes the real globals on restore.
  var __WEB_GLOBALS = ${webJson};
  for (var __i = 0; __i < __WEB_GLOBALS.length; __i++) {
    try { delete globalThis[__WEB_GLOBALS[__i]]; } catch (e) {}
  }
  for (var __k = 0; __k < __WEB_GLOBALS.length; __k++) {
    try { Object.defineProperty(globalThis, __WEB_GLOBALS[__k], { value: function WebGlobalStub(){}, configurable: true, writable: true }); } catch (e) {}
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

  // isBuiltin: tells builtin "tool" modules (path/fs/module — load for real at
  // build) apart from non-builtin packages (lazy-stubbed at build).
  globalThis.__isBuiltin = (function () {
    try { return process.getBuiltinModule('node:module').isBuiltin; } catch (e) { return function () { return false; }; }
  })();

  globalThis.__makeLazyExt = function (id, thunk) {
    var realMod = function () { var rt = globalThis.__RUNTIME_REQUIRE; return rt ? rt(id) : undefined; };
    var EXPORTS = (globalThis.__EXTERNAL_EXPORTS && globalThis.__EXTERNAL_EXPORTS[id]) || [];
    var isHttp = id === 'http' || id === 'node:http' || id === 'https' || id === 'node:https';

    // Call args captured at build can themselves be member-proxies — e.g. a model column
    // \`DataTypes.TEXT(LENGTH_VARIANTS.long)\` where LENGTH_VARIANTS is also a lazy export.
    // They must be resolved to their real values before reaching the real callee, or the
    // callee receives a Proxy and mishandles it (leoric coerces it to a string in an error
    // template and throws "String.prototype.toString requires that 'this' be a String").
    // A member-proxy returns its resolved value via the __MR symbol; anything else passes
    // through unchanged.
    var __MR = globalThis.__MEMBER_RESOLVE || (globalThis.__MEMBER_RESOLVE = Symbol.for('@eggjs/egg-bundler:memberResolve'));
    var resolveArg = function (a) {
      if (a && (typeof a === 'object' || typeof a === 'function')) {
        try { var rv = a[__MR]; if (rv !== undefined) return rv; } catch (e) {}
      }
      return a;
    };
    var resolveArgs = function (args) { var out = []; for (var i = 0; i < args.length; i++) out.push(resolveArg(args[i])); return out; };

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
          // Use Reflect.apply/construct (invoke [[Call]]/[[Construct]] directly) rather
          // than v.apply(...): when an earlier step resolved to a member-proxy (a callable
          // Proxy), \`typeof v === 'function'\` is true but \`v.apply\` is undefined, so
          // \`v.apply(...)\` throws "v.apply is not a function" (hit by e.g. leoric's
          // createType introspecting a proxied DataType). Reflect.apply works on any callable.
          else if (op.t === 'a') { v = (typeof v === 'function') ? Reflect.apply(v, prev, resolveArgs(op.args)) : undefined; prev = undefined; }
          else if (op.t === 'c') { v = (typeof v === 'function') ? Reflect.construct(v, resolveArgs(op.args)) : undefined; prev = undefined; }
        }
        return v;
      };
      // Accessors on the real prototype must keep the original receiver when
      // this proxy sits in an inheritance chain. Direct access to the proxy
      // still uses the real prototype so accessors never observe a proxy \`this\`.
      var protoProxy = new Proxy({}, {
        get: function (t, p, receiver) {
          var r = resolve();
          if (!(r && r.prototype)) return undefined;
          return Reflect.get(r.prototype, p, receiver === protoProxy || receiver === undefined ? r.prototype : receiver);
        },
        set: function (t, p, v, receiver) {
          var r = resolve();
          if (r && r.prototype) return Reflect.set(r.prototype, p, v, receiver === protoProxy || receiver === undefined ? r.prototype : receiver);
          return Reflect.set(t, p, v, receiver);
        },
      });
      // Pick the proxy target so \`typeof member\` matches what the resolved value will be:
      // a call/construct RESULT is normally an instance (typeof 'object'), while a plain
      // member access is usually a class/function (typeof 'function'). Libraries branch on
      // \`typeof x === 'function'\` (e.g. leoric's createType: function ⇒ DataType class,
      // object ⇒ DataType instance) — a uniformly-function proxy would take the wrong path.
      // (A non-callable target makes the apply/construct traps dead, which is correct: a
      // resolved instance is not meant to be called.)
      var __lastOp = ops.length ? ops[ops.length - 1] : null;
      var __target = __lastOp && (__lastOp.t === 'a' || __lastOp.t === 'c') ? {} : function () {};
      var member = new Proxy(__target, {
        get: function (t, p, receiver) { if (p === __MR) return resolve(); if (p === 'prototype') return protoProxy; var r = resolve(); if (r != null) return Reflect.get(Object(r), p, receiver === member || receiver === undefined ? r : receiver); if (p === 'then') return undefined; if (typeof p === 'symbol') return undefined; return makeMember(ops.concat([{ t: 'g', k: p }])); },
        set: function (t, p, v, receiver) { var r = resolve(); if (r != null) return Reflect.set(Object(r), p, v, receiver === member || receiver === undefined ? r : receiver); return Reflect.set(t, p, v, receiver); },
        apply: function (t, thisArg, args) { var r = resolve(); if (typeof r === 'function') return Reflect.apply(r, thisArg, resolveArgs(args)); return makeMember(ops.concat([{ t: 'a', args: args }])); },
        construct: function (t, args, nt) { var r = resolve(); if (typeof r === 'function') return Reflect.construct(r, resolveArgs(args), nt || r); return makeMember(ops.concat([{ t: 'c', args: args }])); }
      });
      return member;
    }

    var proxy = new Proxy(function () {}, {
      get: function (target, prop, receiver) {
        if (prop === __MR) return realMod();
        if (prop === 'default') return proxy;
        var real = realMod();
        if (real != null) return Reflect.get(Object(real), prop, receiver === proxy || receiver === undefined ? real : receiver);
        // Build-time http constants so a library iterating http.METHODS etc.
        // (e.g. \`for (const m of http.METHODS)\`) does not crash.
        if (isHttp && typeof prop === 'string' && globalThis.__HTTP_CONSTS && Object.prototype.hasOwnProperty.call(globalThis.__HTTP_CONSTS, prop)) return globalThis.__HTTP_CONSTS[prop];
        if (prop === '__esModule') return undefined;
        if (prop === 'then') return undefined;
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'prototype' || prop === 'name' || prop === 'length') return Reflect.get(target, prop);
        return makeMember([{ t: 'g', k: prop }]);
      },
      apply: function (target, thisArg, args) { var real = realMod(); if (typeof real === 'function') return Reflect.apply(real, thisArg, resolveArgs(args)); return undefined; },
      construct: function (target, args, nt) { var real = realMod(); if (typeof real === 'function') return Reflect.construct(real, resolveArgs(args), nt || real); return Object.create((nt && nt.prototype) || target.prototype); },
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

  // Restore-time re-installer for the web globals the build replaced with stubs.
  // Serialized into the blob and called by the generated snapshot-restore entry AFTER
  // globalThis.__RUNTIME_REQUIRE is set. Without it globalThis.fetch (etc.) stays the
  // build-time WebGlobalStub in the live process. The fetch family comes from the
  // app's real \`undici\` (kept external, so it loads for real at restore — resolved
  // directly, or through \`urllib\` for pnpm layouts where undici is not hoisted);
  // File/Blob come from \`node:buffer\`. Each becomes a lazy accessor so the real
  // module only loads on first access.
  var __UNDICI_GLOBALS = ${undiciGlobalsJson};
  var __BUFFER_GLOBALS = ${bufferGlobalsJson};
  globalThis.__installWebGlobalsLazy = function () {
    var rt = globalThis.__RUNTIME_REQUIRE;
    var getBuiltin = function (id) {
      try { return process.getBuiltinModule(id); } catch (e) { return typeof rt === 'function' ? rt(id) : undefined; }
    };
    var __undici;
    var __undiciTried = false;
    var loadUndici = function () {
      if (__undiciTried) return __undici;
      __undiciTried = true;
      if (typeof rt !== 'function') return (__undici = undefined);
      try { __undici = rt('undici'); return __undici; } catch (e) {}
      try {
        var mod = getBuiltin('node:module');
        if (mod && typeof rt.resolve === 'function') __undici = mod.createRequire(rt.resolve('urllib'))('undici');
      } catch (e2) { __undici = undefined; }
      return __undici;
    };
    var loadBuffer = function () { return getBuiltin('node:buffer'); };
    var install = function (name, getSource) {
      // Replace the build stub (a function named WebGlobalStub) or an absent slot;
      // never clobber a non-configurable global or a genuine value.
      var existing = Object.getOwnPropertyDescriptor(globalThis, name);
      if (existing) {
        if (existing.configurable === false) return;
        if (!('value' in existing)) return;
        var cur = existing.value;
        if (cur !== undefined && !(cur && cur.name === 'WebGlobalStub')) return;
      }
      var define = function (value) {
        Object.defineProperty(globalThis, name, { value: value, writable: true, enumerable: false, configurable: true });
        return value;
      };
      Object.defineProperty(globalThis, name, {
        configurable: true,
        enumerable: false,
        get: function () {
          var value;
          try { var src = getSource(); value = src ? src[name] : undefined; } catch (e) { value = undefined; }
          // Do not cache undefined: the source module may still be loading when this
          // fires re-entrantly (undici reads globalThis.Headers while its own require()
          // is in flight), so leave the accessor in place for a later read to resolve.
          if (value !== undefined) return define(value);
          return undefined;
        },
        set: function (value) { define(value); }
      });
    };
    for (var __u = 0; __u < __UNDICI_GLOBALS.length; __u++) install(__UNDICI_GLOBALS[__u], loadUndici);
    for (var __b = 0; __b < __BUFFER_GLOBALS.length; __b++) install(__BUFFER_GLOBALS[__b], loadBuffer);
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
  // Function/class internals that are own-properties but never real exports.
  const FN_INTERNALS = new Set(['length', 'name', 'prototype', 'arguments', 'caller']);
  const collect = (mod: unknown): string[] => {
    const set = new Set<string>();
    const add = (o: unknown) => {
      if (!o || (typeof o !== 'object' && typeof o !== 'function')) return;
      // getOwnPropertyNames (not Object.keys) so NON-ENUMERABLE named exports are
      // included — @utoo/pack's interopEsm enumerates getOwnPropertyNames(raw) to build
      // the ESM namespace, so EXPORTS must match or `import { X }` would resolve to
      // undefined for a non-enumerable X.
      for (const k of Object.getOwnPropertyNames(o)) {
        if (typeof o === 'function' && FN_INTERNALS.has(k)) continue;
        set.add(k);
      }
    };
    add(mod);
    // CJS packages required as ESM expose named exports on `default`; merge them
    // (e.g. leoric's `DataTypes`/`Bone` only show up under default via import).
    if (mod && typeof mod === 'object') add((mod as Record<string, unknown>).default);
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
