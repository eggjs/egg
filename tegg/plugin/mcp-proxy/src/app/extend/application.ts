import type { Application } from 'egg';

import { MCPProxyApiClient } from '../../index.ts';
const MCP_PROXY = Symbol('Application#mcpProxy');

export default {
  get mcpProxy(): any {
    const self = this as any;
    if (!self[MCP_PROXY]) {
      self[MCP_PROXY] = new MCPProxyApiClient({
        logger: (this as unknown as Application).logger,
        messenger: (this as unknown as Application).messenger,
        app: this as unknown as Application,
      });
    }
    return self[MCP_PROXY];
  },
};
