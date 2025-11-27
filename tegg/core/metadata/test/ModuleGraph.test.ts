import assert from 'node:assert/strict';
import path from 'node:path';

import { describe, it } from 'vitest';

import { ModuleGraph } from '../src/index.js';
import { TestLoader } from './fixtures/TestLoader.js';

describe('test/ModuleGraph.test.ts', () => {
  it('should sort extends class success', async () => {
    const modulePath = path.join(__dirname, './fixtures/modules/extends-module');
    const loader = new TestLoader(modulePath);
    const clazzList = await loader.load();
    const graph = new ModuleGraph(clazzList, modulePath, 'foo');
    await graph.build();
    graph.sort();
  });

  it('should sort constructor extends class success', async () => {
    const modulePath = path.join(__dirname, './fixtures/modules/extends-constructor-module');
    const loader = new TestLoader(modulePath);
    const clazzList = await loader.load();
    const graph = new ModuleGraph(clazzList, modulePath, 'foo');
    await graph.build();
    graph.sort();
    assert.deepStrictEqual(
      graph.clazzList.map((t) => t.name),
      ['Logger', 'Bar', 'ConstructorBase', 'FooConstructor', 'FooConstructorLogger'],
    );
  });
});
