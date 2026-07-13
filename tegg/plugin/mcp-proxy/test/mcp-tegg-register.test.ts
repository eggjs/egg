import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

// Boots an egg app with teggController + mcpProxy enabled and a tegg
// @MCPController, exercising the egg MCP registration path end to end:
// app.mcpRouter is mounted in the controller boot, fed to inner objects via the
// egg compat proto, injected by EggMCPRegisterProvider which plugs the MCP
// register creator into the factory; the controller load then drives
// EggMcpRouter.registerServer to mount the MCP routes. If any of that wiring
// breaks, app.ready() throws "not find controller implement ... MCP".
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
    // GET on the stateless stream path is registered to a 405 notHandler when
    // the server is registered; a 404 would mean the route was never mounted.
    const res = await app.httpRequest().get('/mcp/stateless/stream');
    expect(res.status).toBe(405);
  });
});
