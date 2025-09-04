import type { RequestListener } from 'node:http';
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import type { Server } from 'node:net';

import type { AgentOptions as SAgentOptions } from 'superagent';

export type H2RequestListener = (
  request: Http2ServerRequest,
  response: Http2ServerResponse
) => void;
export type H1RequestListener = RequestListener;

export type App = Server | H1RequestListener | H2RequestListener | string;

export interface AgentOptions extends SAgentOptions {
  http2?: boolean;
}
