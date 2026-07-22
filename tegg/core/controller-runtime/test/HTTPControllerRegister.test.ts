import assert from 'node:assert/strict';

import type { HTTPControllerMeta, HTTPMethodMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import type { Router } from '@eggjs/router';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { HTTPControllerRegister } from '../src/lib/impl/http/HTTPControllerRegister.ts';
import type { HTTPMethodRegister } from '../src/lib/impl/http/HTTPMethodRegister.ts';
import type { RootProtoManager } from '../src/lib/RootProtoManager.ts';

describe('HTTPControllerRegister', () => {
  it('creates one method register and validates all routes before registration', () => {
    const first = { name: 'first', priority: 1 } as HTTPMethodMeta;
    const second = { name: 'second', priority: 2 } as HTTPMethodMeta;
    const metadata = { methods: [first, second] } as unknown as HTTPControllerMeta;
    const proto = {
      getMetaData(key: string | symbol) {
        assert.equal(key, CONTROLLER_META_DATA);
        return metadata;
      },
    } as EggPrototype;
    const created: string[] = [];
    const operations: string[] = [];
    const validationRouters: Array<Map<string, Router>> = [];
    const register = new HTTPControllerRegister(
      {} as Router,
      EggContainerFactory,
      (_proto, _meta, method, _router, routers) => {
        created.push(method.name);
        validationRouters.push(routers);
        return {
          checkDuplicate() {
            operations.push(`check:${method.name}`);
          },
          register() {
            operations.push(`register:${method.name}`);
          },
        } as unknown as HTTPMethodRegister;
      },
    );

    register.addControllerProto(proto);
    register.doRegister({} as RootProtoManager);

    assert.deepEqual(created, ['second', 'first']);
    assert.deepEqual(operations, ['check:second', 'check:first', 'register:second', 'register:first']);
    assert.equal(validationRouters[0], validationRouters[1]);
  });
});
