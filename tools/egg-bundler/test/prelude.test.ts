import { describe, expect, it } from 'vitest';

import { prependSnapshotPrelude, renderSnapshotPrelude, SNAPSHOT_PRELUDE_MARKER } from '../src/lib/prelude.ts';

describe('snapshot prelude', () => {
  it('renders a marked placeholder block', () => {
    const prelude = renderSnapshotPrelude();
    expect(prelude).toContain(SNAPSHOT_PRELUDE_MARKER);
    expect(prelude).toContain('eggBundlerSnapshotPrelude');
    // ends with a newline so it cleanly precedes the bundle IIFE
    expect(prelude.endsWith('\n')).toBe(true);
  });

  it('prepends the prelude before the bundle IIFE', () => {
    const bundle = '((__UTOOPACK__)=>{/* modules */})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith(renderSnapshotPrelude())).toBe(true);
    expect(out).toContain(bundle);
    // prelude precedes the IIFE
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });

  it('is idempotent: a second prepend does not duplicate the prelude', () => {
    const bundle = '((__UTOOPACK__)=>{})([]);\n';
    const once = prependSnapshotPrelude(bundle);
    const twice = prependSnapshotPrelude(once);
    expect(twice).toBe(once);
    const occurrences = twice.split(SNAPSHOT_PRELUDE_MARKER).length - 1;
    expect(occurrences).toBe(1);
  });

  it('keeps a leading shebang on the first line', () => {
    const bundle = '#!/usr/bin/env node\n((__UTOOPACK__)=>{})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith('#!/usr/bin/env node\n')).toBe(true);
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeGreaterThan(0);
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });

  it('keeps a leading "use strict" directive ahead of the prelude', () => {
    const bundle = '"use strict";\n((__UTOOPACK__)=>{})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith('"use strict";\n')).toBe(true);
    const marker = out.indexOf(SNAPSHOT_PRELUDE_MARKER);
    expect(marker).toBeGreaterThan('"use strict";'.length);
    expect(marker).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });
});
