import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';

import mm from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

const require = createRequire(import.meta.url);

describe('plugin/mcp-client/test/mcpclient.test.ts', () => {
  let startSSEServer: any;
  let stopSSEServer: any;
  let startStreamableServer: any;
  let stopStreamableServer: any;
  let app: any;

  beforeAll(async () => {
    const sseFixturePath = './fixtures/sse-mcp-server/http.ts';
    const sseMod = await import(sseFixturePath);
    startSSEServer = sseMod.startSSEServer;
    stopSSEServer = sseMod.stopSSEServer;
    const streamFixturePath = './fixtures/streamable-mcp-server/http.ts';
    const streamMod = await import(streamFixturePath);
    startStreamableServer = streamMod.startStreamableServer;
    stopStreamableServer = streamMod.stopStreamableServer;

    await startStreamableServer(17263);
    await startSSEServer(17253);
  }, 30_000);

  afterAll(async () => {
    await app.close();
    await stopSSEServer();
    await stopStreamableServer();
  });

  afterEach(() => {
    mm.restore();
  });

  beforeAll(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/mcpclient'),
      framework: path.dirname(require.resolve('egg/package.json')),
    });
    await app.ready();
  }, 30_000);

  afterAll(() => {
    return app.close();
  });

  it('should sse work', async () => {
    const res = await app.httpRequest().get('/mcpclient/hello-sse').expect(200);
    assert.deepStrictEqual(res.body, {
      tools: [
        {
          execution: {
            taskSupport: 'forbidden',
          },
          name: 'add',
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            type: 'object',
            properties: {
              a: {
                type: 'number',
              },
              b: {
                type: 'number',
              },
            },
            required: ['a', 'b'],
          },
        },
      ],
    });
  });

  it('should streamable work', async () => {
    const res = await app.httpRequest().get('/mcpclient/hello-streamable').expect(200);
    assert.deepStrictEqual(res.body, {
      tools: [
        {
          name: 'add',
          execution: {
            taskSupport: 'forbidden',
          },
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            type: 'object',
            properties: {
              a: {
                type: 'number',
              },
              b: {
                type: 'number',
              },
            },
            required: ['a', 'b'],
          },
        },
      ],
    });
  });

  it('should factory work', async () => {
    const res = await app.httpRequest().get('/mcpclient/hello-factory').expect(200);
    assert.deepStrictEqual(res.body, {
      tools: [
        {
          name: 'add',
          execution: {
            taskSupport: 'forbidden',
          },
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            type: 'object',
            properties: {
              a: {
                type: 'number',
              },
              b: {
                type: 'number',
              },
            },
            required: ['a', 'b'],
          },
        },
      ],
    });
  });

  it('should langchain tools work', async () => {
    const res = await app.httpRequest().get('/mcpclient/hello-langchain-tools').expect(200);
    assert.deepStrictEqual(res.body, {
      length: 1,
      tools: [
        {
          name: 'add',
          description: '',
          schema: {
            additionalProperties: false,
            type: 'object',
            properties: {
              a: {
                type: 'number',
              },
              b: {
                type: 'number',
              },
            },
            required: ['a', 'b'],
          },
        },
      ],
    });
  });
});
