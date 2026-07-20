import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

// End-to-end coverage for Egg MCP controller registration and route mounting.
describe('plugin/mcp-proxy/test/mcp-tegg-register.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/mcp-tegg-controller'),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('mounts app.mcpRouter through the controller boot', () => {
    expect((app as any).mcpRouter).toBeTruthy();
    expect((app as any).mcpRouter.constructor.name).toBe('EggMcpRouter');
  });

  it('registers the MCP routes (registerServer ran)', async () => {
    const res = await app.httpRequest().get('/mcp/stateless/stream');
    expect(res.status).toBe(405);
  });
});
