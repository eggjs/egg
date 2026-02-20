import { randomUUID } from 'node:crypto';

export default (): {
  mcp: {
    sseInitPath: string;
    sseMessagePath: string;
    streamPath: string;
    statelessStreamPath: string;
    sessionIdGenerator: typeof randomUUID;
  };
} => {
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
