import assert from 'node:assert/strict';

import { afterEach, describe, expect, it } from 'vitest';

import { TeggScope, type TeggScopeBag } from '../src/index.ts';

// Track scopes registered within a test so afterEach can always return the
// process-global state (live scope bags + default bag) to a clean baseline,
// regardless of how the test exits.
const registered: TeggScopeBag[] = [];

function register(): TeggScopeBag {
  const bag = TeggScope.createBag();
  TeggScope.registerScope(bag);
  registered.push(bag);
  return bag;
}

afterEach(() => {
  for (const bag of registered.splice(0)) {
    TeggScope.unregisterScope(bag);
  }
  TeggScope._resetDefaultBag();
});

describe('TeggScope', () => {
  const SLOT = Symbol('tegg:test:slot');

  it('run/current expose the active bag', () => {
    assert.equal(TeggScope.current(), undefined);
    const bag = TeggScope.createBag();
    const seen = TeggScope.run(bag, () => TeggScope.current());
    assert.equal(seen, bag);
    // scope ends with the callback
    assert.equal(TeggScope.current(), undefined);
  });

  it('tracks live scope count and multi-app mode', () => {
    assert.equal(TeggScope.scopeCount, 0);
    assert.equal(TeggScope.isMultiApp, false);
    register();
    assert.equal(TeggScope.scopeCount, 1);
    assert.equal(TeggScope.isMultiApp, false);
    register();
    assert.equal(TeggScope.scopeCount, 2);
    assert.equal(TeggScope.isMultiApp, true);
  });

  it('resolve memoizes within the active bag', () => {
    const bag = TeggScope.createBag();
    let created = 0;
    const a = TeggScope.run(bag, () => TeggScope.resolve(SLOT, () => ++created, 'test'));
    const b = TeggScope.run(bag, () => TeggScope.resolve(SLOT, () => ++created, 'test'));
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(created, 1);
    assert.equal(bag.get(SLOT), 1);
  });

  it('with no scope and no app, resolve/getOr/set use the process-default bag', () => {
    assert.equal(TeggScope._getDefaultBag(), undefined);
    const v = TeggScope.resolve(SLOT, () => 'created', 'test');
    assert.equal(v, 'created');
    // memoized in the lazily-created default bag
    assert.equal(TeggScope._getDefaultBag()?.get(SLOT), 'created');
    assert.equal(
      TeggScope.resolve(SLOT, () => 'other', 'test'),
      'created',
    );

    TeggScope.set(SLOT, 'updated');
    assert.equal(
      TeggScope.getOr(SLOT, () => 'legacy', 'test'),
      'updated',
    );
  });

  it('getOr returns the legacy fallback only until a value is set', () => {
    assert.equal(
      TeggScope.getOr(SLOT, () => 'legacy', 'test'),
      'legacy',
    );
    TeggScope.set(SLOT, 'real');
    assert.equal(
      TeggScope.getOr(SLOT, () => 'legacy', 'test'),
      'real',
    );
  });

  it('with exactly one app alive, out-of-scope access resolves that app bag', () => {
    const bag = register();
    // populate the app bag from inside its scope (as boot does)
    TeggScope.run(bag, () => {
      TeggScope.set(SLOT, 'app-state');
    });
    // ...and read it back WITHOUT an active scope (single-app fallback)
    assert.equal(
      TeggScope.getOr(SLOT, () => undefined, 'test'),
      'app-state',
    );
    assert.equal(
      TeggScope.resolve(SLOT, () => 'fresh', 'test'),
      'app-state',
    );
    // the sole-app bag is the storage, not a separate default bag
    assert.equal(TeggScope._getDefaultBag(), undefined);
    assert.equal(bag.get(SLOT), 'app-state');
  });

  it('out-of-scope writes also land in the sole app bag', () => {
    const bag = register();
    TeggScope.set(SLOT, 'written-out-of-scope');
    assert.equal(bag.get(SLOT), 'written-out-of-scope');
    assert.equal(
      TeggScope.run(bag, () => TeggScope.getOr(SLOT, () => undefined, 'test')),
      'written-out-of-scope',
    );
  });

  describe('strict-mode escape fuse (multi-app)', () => {
    it('throws on out-of-scope resolve/getOr/set when more than one app is alive', () => {
      register();
      register();
      assert.equal(TeggScope.isMultiApp, true);
      expect(() => TeggScope.resolve(SLOT, () => 1, 'resolve')).toThrow(/escaped to the process-default bag/);
      expect(() => TeggScope.getOr(SLOT, () => 1, 'getOr')).toThrow(/escaped to the process-default bag/);
      expect(() => TeggScope.set(SLOT, 1)).toThrow(/escaped to the process-default bag/);
    });

    it('does not throw for in-scope access under multi-app', () => {
      const bag = register();
      register();
      const v = TeggScope.run(bag, () => {
        TeggScope.set(SLOT, 'scoped');
        return TeggScope.resolve(SLOT, () => 'fresh', 'resolve');
      });
      assert.equal(v, 'scoped');
    });
  });
});
