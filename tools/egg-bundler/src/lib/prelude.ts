/**
 * Snapshot prelude generation.
 *
 * In snapshot mode the bundler prepends this prelude to the emitted single-file
 * `worker.js`, BEFORE the bundle IIFE (`((__UTOOPACK__)=>{...})([...modules])`),
 * so it runs before any bundled module is evaluated. It installs the
 * lazy-external / native-binding stub mechanism that keeps a V8 startup snapshot
 * serializable: the Node network stack (http/https/http2/tls/dns) is NOT loaded
 * while the snapshot is built (its native bindings — HTTPParser, nghttp2
 * settingsBuffer, tls SecureContext, dns ChannelWrap — cannot be serialized, and
 * `WebAssembly` is disabled under `--build-snapshot`), then forwarded to the real
 * module at restore time via `globalThis.__RUNTIME_REQUIRE` (installed by the
 * generated snapshot-restore entry).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

const debug = debuglog('egg/bundler/snapshot-prelude');

/**
 * Marker comment embedded in the prelude. Used to detect an already-prepended
 * prelude so {@link prependSnapshotPrelude} stays idempotent across re-runs.
 */
export const SNAPSHOT_PRELUDE_MARKER = '@eggjs/egg-bundler:snapshot-prelude';

/**
 * Node built-in network modules that produce non-serializable native bindings when
 * loaded inside a V8 startup snapshot builder:
 *
 * - `node:http` / `node:https` create an `HTTPParser` (llhttp) C++ global handle.
 * - `node:http2` creates `HTTPParser` + an `nghttp2` `settingsBuffer` Uint32Array.
 * - `node:tls` creates a `SecureContext`.
 * - `node:dns` creates a `ChannelWrap`.
 *
 * Egg's loader phase touches the HTTP/TLS/DNS stack (HttpClient, agents, etc.), so
 * these are kept as lazy externals: build time returns a stub Proxy; restore time
 * forwards to the real module via `globalThis.__RUNTIME_REQUIRE`.
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
];

/**
 * Node's lazy web globals. Accessing any of them lazily initializes undici, whose
 * llhttp parser allocates a `WebAssembly` instance + `HTTPParser` binding that the
 * snapshot builder cannot serialize. They are removed with `delete` before any
 * bundled module runs. `Object.defineProperty` is NOT usable here: redefining the
 * lazy accessor triggers the very undici load we are avoiding.
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

/** `http.METHODS` — hardcoded so a library's top-level `[...http.METHODS]` does not force a build-time load. */
const HTTP_METHODS: readonly string[] = [
  'ACL',
  'BIND',
  'CHECKOUT',
  'CONNECT',
  'COPY',
  'DELETE',
  'GET',
  'HEAD',
  'LINK',
  'LOCK',
  'M-SEARCH',
  'MERGE',
  'MKACTIVITY',
  'MKCALENDAR',
  'MKCOL',
  'MOVE',
  'NOTIFY',
  'OPTIONS',
  'PATCH',
  'POST',
  'PROPFIND',
  'PROPPATCH',
  'PURGE',
  'PUT',
  'QUERY',
  'REBIND',
  'REPORT',
  'SEARCH',
  'SOURCE',
  'SUBSCRIBE',
  'TRACE',
  'UNBIND',
  'UNLINK',
  'UNLOCK',
  'UNSUBSCRIBE',
];

/** `http.STATUS_CODES` — hardcoded for the same reason as METHODS. */
const HTTP_STATUS_CODES: Readonly<Record<string, string>> = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',
  '103': 'Early Hints',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',
  '208': 'Already Reported',
  '226': 'IM Used',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '414': 'URI Too Long',
  '415': 'Unsupported Media Type',
  '416': 'Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': "I'm a Teapot",
  '421': 'Misdirected Request',
  '422': 'Unprocessable Entity',
  '423': 'Locked',
  '424': 'Failed Dependency',
  '425': 'Too Early',
  '426': 'Upgrade Required',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '431': 'Request Header Fields Too Large',
  '451': 'Unavailable For Legal Reasons',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  '505': 'HTTP Version Not Supported',
  '506': 'Variant Also Negotiates',
  '507': 'Insufficient Storage',
  '508': 'Loop Detected',
  '509': 'Bandwidth Limit Exceeded',
  '510': 'Not Extended',
  '511': 'Network Authentication Required',
};

const HTTP_MAX_HEADER_SIZE = 16384;

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
 * It (1) deletes Node's lazy web globals and (2) installs `globalThis.__LAZY_EXT`
 * (the set of lazy module ids) + `globalThis.__makeLazyExt` (the build-time stub /
 * restore-time forwarder) that the patched `externalRequire` (see
 * {@link injectExternalRequireLazyHook}) consults for every external require.
 */
export function renderSnapshotPrelude(lazyModules: readonly string[] = DEFAULT_SNAPSHOT_LAZY_MODULES): string {
  const lazyJson = JSON.stringify([...lazyModules]);
  const webJson = JSON.stringify([...WEB_GLOBALS]);
  const methodsJson = JSON.stringify([...HTTP_METHODS]);
  const statusJson = JSON.stringify(HTTP_STATUS_CODES);

  return `// ⚠️ auto-generated by @eggjs/egg-bundler — snapshot prelude (do not edit)
// marker: ${SNAPSHOT_PRELUDE_MARKER}
// Runs before the bundle IIFE so it executes before any bundled module loads.
/* eslint-disable */
(function eggBundlerSnapshotPrelude() {
  'use strict';
  // Drop Node's lazy web globals before any bundled module touches them. These
  // getters lazily initialize undici, whose llhttp HTTPParser / WebAssembly cannot
  // be V8-snapshot-serialized. MUST use \`delete\`: redefining the lazy accessor
  // would trigger the very load we are avoiding.
  var __WEB_GLOBALS = ${webJson};
  for (var __i = 0; __i < __WEB_GLOBALS.length; __i++) {
    try { delete globalThis[__WEB_GLOBALS[__i]]; } catch (e) {}
  }

  if (globalThis.__LAZY_EXT) return;

  // Set of module ids treated as lazy externals. The patched externalRequire
  // forwards these here instead of requiring the real module at build time.
  globalThis.__LAZY_EXT = new Set(${lazyJson});

  // Hardcoded http constants so top-level \`[...http.METHODS]\` or
  // \`Object.keys(http.STATUS_CODES)\` in a bundled library does not force a
  // build-time load of the real (non-serializable) http module.
  var __HTTP_METHODS = ${methodsJson};
  var __HTTP_STATUS_CODES = ${statusJson};
  var __HTTP_MAX_HEADER_SIZE = ${HTTP_MAX_HEADER_SIZE};

  globalThis.__makeLazyExt = function (id, thunk) {
    var isHttp = id === 'http' || id === 'node:http' || id === 'https' || id === 'node:https';
    // Build time: globalThis.__RUNTIME_REQUIRE is unset -> returns undefined, the
    // real module is never loaded. Restore time: __RUNTIME_REQUIRE (installed by the
    // generated snapshot-restore entry) really requires the module, so
    // http.createServer is the genuine builtin and the app truly listens.
    var realModule = function () {
      var rt = globalThis.__RUNTIME_REQUIRE;
      return rt ? rt(id) : undefined;
    };
    var buildConst = function (prop) {
      if (!isHttp) return undefined;
      if (prop === 'METHODS') return __HTTP_METHODS;
      if (prop === 'STATUS_CODES') return __HTTP_STATUS_CODES;
      if (prop === 'maxHeaderSize') return __HTTP_MAX_HEADER_SIZE;
      return undefined;
    };
    var proxy = new Proxy(function () {}, {
      get: function (target, prop) {
        if (prop === 'default') return proxy;
        var real = realModule();
        if (real !== undefined && real !== null) {
          return real[prop];
        }
        // --- build time only below ---
        if (typeof prop === 'string') {
          var c = buildConst(prop);
          if (c !== undefined) return c;
        }
        if (prop === '__esModule') return undefined;
        if (typeof prop === 'symbol') return undefined;
        // Never expose a build-time \`then\`: returning the callable proxy would make
        // the stub a thenable, so \`await require(id)\` / Promise.resolve(stub) hangs
        // (apply never resolves). At restore the real module forwards \`then\` above.
        if (prop === 'then') return undefined;
        // Satisfy Proxy invariants: the function target's own non-configurable
        // props (prototype/length/name) must be reported faithfully.
        if (prop === 'prototype' || prop === 'name' || prop === 'length') {
          return Reflect.get(target, prop);
        }
        return proxy; // chainable build-time stub
      },
      apply: function (target, thisArg, args) {
        var real = realModule();
        if (typeof real === 'function') return Reflect.apply(real, thisArg, args);
        return undefined;
      },
      construct: function (target, args) {
        var real = realModule();
        if (typeof real === 'function') return Reflect.construct(real, args);
        return proxy; // build time: keep \`new Stub().method()\` chainable
      },
      has: function (target, prop) {
        var real = realModule();
        if (real !== undefined && real !== null) return prop in real;
        return true;
      },
      // Structural traps. At restore time reflect the REAL module's keys so
      // Object.keys / spread / destructuring-rest over e.g. require('http') see the
      // genuine exports; at build time fall back to the target. Either way the
      // function target's own non-configurable keys (prototype) stay reported so the
      // Proxy invariants hold. Real descriptors are forced configurable to avoid the
      // "report a non-configurable prop absent from target" invariant violation.
      ownKeys: function (target) {
        var real = realModule();
        if (real === undefined || real === null) return Reflect.ownKeys(target);
        var keys = Reflect.ownKeys(real);
        var targetKeys = Reflect.ownKeys(target);
        for (var i = 0; i < targetKeys.length; i++) {
          if (keys.indexOf(targetKeys[i]) === -1) keys.push(targetKeys[i]);
        }
        return keys;
      },
      getOwnPropertyDescriptor: function (target, prop) {
        var targetDesc = Reflect.getOwnPropertyDescriptor(target, prop);
        if (targetDesc && !targetDesc.configurable) return targetDesc;
        var real = realModule();
        if (real === undefined || real === null) return targetDesc;
        var desc = Reflect.getOwnPropertyDescriptor(real, prop);
        if (desc) desc.configurable = true;
        return desc;
      },
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
): string {
  // Only look for the marker in the file head (the prelude is short and always
  // sits at the very top). A whole-file `includes` would false-positive if any
  // bundled application/dependency code happened to contain the marker string,
  // silently skipping prelude injection.
  if (source.slice(0, 1024).includes(SNAPSHOT_PRELUDE_MARKER)) {
    return source;
  }

  const prelude = renderSnapshotPrelude(lazyModules);
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
 * if (globalThis.__LAZY_EXT && globalThis.__LAZY_EXT.has(id)) return globalThis.__makeLazyExt(id, thunk);
 * ```
 *
 * so a require of a lazy module id is rerouted to {@link renderSnapshotPrelude}'s
 * `__makeLazyExt` instead of loading the real (non-serializable) module.
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
    return `${match} if (globalThis.__LAZY_EXT && globalThis.__LAZY_EXT.has(${idParam})) return globalThis.__makeLazyExt(${idParam}, ${thunkParam});`;
  });
  return { content: next, injected };
}
