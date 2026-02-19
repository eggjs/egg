import { randomUUID } from 'node:crypto';

export default () => {
  const config = {
    mcp: {
      sseInitPath: '/mcp/sse',
      sseMessagePath: '/mcp/message',
      streamPath: '/mcp/stream',
      statelessStreamPath: '/mcp/stateless/stream',
      sessionIdGenerator: randomUUID,
    },
  };

  return config;
};
