import assert from 'node:assert/strict';

import { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { MCPControllerRegister } from '../src/lib/impl/mcp/MCPControllerRegister.ts';
import type { McpRouter, McpServerRegistration } from '../src/lib/impl/mcp/McpRouter.ts';

function createProto(name: string, metadata: MCPControllerMeta): EggPrototype {
  return {
    name,
    getMetaData(key: string | symbol) {
      assert.equal(key, CONTROLLER_META_DATA);
      return metadata;
    },
  } as unknown as EggPrototype;
}

function createMetadata(
  className: string,
  serverName: string | undefined,
  options: {
    tools?: MCPToolMeta[];
    resources?: MCPResourceMeta[];
    prompts?: MCPPromptMeta[];
    version?: string;
  },
): MCPControllerMeta {
  return new MCPControllerMeta(
    className,
    className,
    className,
    options.version ?? '1.0.0',
    options.tools ?? [],
    options.resources ?? [],
    options.prompts ?? [],
    [],
    serverName,
  );
}

describe('MCPControllerRegister', () => {
  it('collects until doRegister and registers each complete server once', async () => {
    const registrations: McpServerRegistration[] = [];
    const router: McpRouter = {
      registerServer(registration) {
        registrations.push(registration);
      },
    };
    const register = new MCPControllerRegister(router);

    const firstMeta = createMetadata('FirstController', 'calc', {
      tools: [new MCPToolMeta({ name: 'add', middlewares: [] })],
      version: '2.0.0',
    });
    const secondMeta = createMetadata('SecondController', 'calc', {
      prompts: [new MCPPromptMeta({ name: 'explain', middlewares: [] })],
      resources: [new MCPResourceMeta({ name: 'result', uri: 'calc://result', middlewares: [] })],
      tools: [new MCPToolMeta({ name: 'subtract', middlewares: [] })],
      version: '3.0.0',
    });
    const defaultMeta = createMetadata('DefaultController', undefined, {
      tools: [new MCPToolMeta({ name: 'ping', middlewares: [] })],
    });

    register.addControllerProto(createProto('firstController', firstMeta));
    await register.register();
    register.addControllerProto(createProto('secondController', secondMeta));
    await register.register();
    register.addControllerProto(createProto('defaultController', defaultMeta));
    await register.register();

    assert.equal(registrations.length, 0);
    register.doRegister();

    assert.equal(registrations.length, 2);
    const calc = registrations.find((registration) => registration.serverName === 'calc');
    assert(calc);
    assert.equal(calc.controllerMeta, firstMeta);
    assert.deepEqual(
      calc.tools.map(({ meta }) => meta.name),
      ['add', 'subtract'],
    );
    assert.deepEqual(
      calc.resources.map(({ meta }) => meta.name),
      ['result'],
    );
    assert.deepEqual(
      calc.prompts.map(({ meta }) => meta.name),
      ['explain'],
    );

    const defaultRegistration = registrations.find((registration) => registration.serverName === 'default');
    assert(defaultRegistration);
    assert.deepEqual(
      defaultRegistration.tools.map(({ meta }) => meta.name),
      ['ping'],
    );
  });
});
