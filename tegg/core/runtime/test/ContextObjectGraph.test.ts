import assert from 'node:assert/strict';

import { ObjectInitType, type EggPrototype } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { ContextObjectGraph } from '../src/impl/ContextObjectGraph.js';

function prototype(id: string, initType: EggPrototype['initType'] = ObjectInitType.SINGLETON): EggPrototype {
  return { id, initType, injectObjects: [] } as unknown as EggPrototype;
}

function inject(parent: EggPrototype, objName: string, proto: EggPrototype) {
  const dependency = { objName, refName: objName, qualifiers: [], proto };
  parent.injectObjects.push(dependency);
  return dependency;
}

describe('ContextObjectGraph', () => {
  it('expands a shared prototype once per cold traversal', () => {
    const root = prototype('root');
    const left = prototype('left');
    const right = prototype('right');
    const shared = prototype('shared');
    const leaf = prototype('leaf', ObjectInitType.CONTEXT);
    inject(root, 'left', left);
    inject(root, 'right', right);
    inject(left, 'shared', shared);
    inject(right, 'shared', shared);
    const dependency = inject(shared, 'leaf', leaf);
    const edges = shared.injectObjects;
    let expansions = 0;
    Object.defineProperty(shared, 'injectObjects', {
      get() {
        expansions++;
        return edges;
      },
    });

    const result = ContextObjectGraph.getContextProto(root);
    assert.deepEqual(result, [dependency]);
    assert.equal(expansions, 1);
    assert.equal(ContextObjectGraph.getContextProto(root), result);
    assert.equal(expansions, 1);

    assert.deepEqual(ContextObjectGraph.getContextProto(right), [dependency]);
    assert.equal(expansions, 2);
  });

  it('collects qualifying incoming edges even when their target was already visited', () => {
    const root = prototype('root');
    const contextParent = prototype('context-parent', ObjectInitType.CONTEXT);
    const singletonParent = prototype('singleton-parent');
    const shared = prototype('shared', ObjectInitType.CONTEXT);
    const first = inject(root, 'contextParent', contextParent);
    inject(root, 'singletonParent', singletonParent);
    inject(contextParent, 'ignored', shared);
    const second = inject(singletonParent, 'shared', shared);
    const alias = inject(singletonParent, 'alias', shared);
    inject(singletonParent, 'shared', shared);

    const result = ContextObjectGraph.getContextProto(root);
    assert.equal(result.length, 3);
    assert.equal(result[0], first);
    assert.equal(result[1], second);
    assert.equal(result[2], alias);
  });
});
