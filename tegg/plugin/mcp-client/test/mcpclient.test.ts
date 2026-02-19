import assert from 'assert';
import path from 'path';

import mm from '@eggjs/mock';

describe('plugin/mcp-client/test/mcpclient.test.ts', () => {
  if (parseInt(process.version.slice(1, 3)) > 17) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSSEServer, stopSSEServer } = require('./fixtures/sse-mcp-server/http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startStreamableServer, stopStreamableServer } = require('./fixtures/streamable-mcp-server/http');
    let app: any;

    before(async () => {
      await startStreamableServer(17263);
      await startSSEServer(17253);
    });

    after(async () => {
      await app.close();
      await stopSSEServer();
      await stopStreamableServer();
    });

    afterEach(() => {
      mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/mcpclient'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(() => {
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
  }
});
