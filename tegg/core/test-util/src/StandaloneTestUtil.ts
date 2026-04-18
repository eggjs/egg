import { createServer, IncomingMessage, OutgoingHttpHeaders, Server, ServerOptions, ServerResponse } from 'node:http';
import { pipeline } from 'node:stream';
import { Headers, BodyInit, Request, Response } from 'undici';
import { FetchEvent } from '@eggjs/tegg-types/standalone';

export type FetchEventListener = (event: FetchEvent) => Promise<Response>;

export interface StartHTTPServerOptions extends ServerOptions {
  listener: FetchEventListener;
}

export class StandaloneTestUtil {
  static skipOnNode(minVersion = 18) {
    const version = parseInt(process.versions.node.split('.')[0], 10);
    return version < minVersion;
  }

  static #buildRequest(req: IncomingMessage): Request {
    const origin = `http://${req.headers.host ?? 'localhost'}`;
    const url = new URL(req.url ?? '', origin);

    const body: BodyInit | null = req.method === 'GET' || req.method === 'HEAD' ? null : req;

    req.headers.host = url.host;

    const headers = new Headers();
    for (const [ name, values ] of Object.entries(req.headers)) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(name, value);
        }
      } else if (values !== undefined) {
        headers.append(name, values);
      }
    }

    return new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: body ? 'half' : undefined,
    });
  }

  static #createHTTPServerListener(listener: FetchEventListener) {
    return async (req: IncomingMessage, res: ServerResponse) => {
      const request = StandaloneTestUtil.#buildRequest(req);
      // TODO currently fake FetchEvent
      const event: any = new Event('fetch');
      event.request = request;
      const response = await listener(event);

      const headers: OutgoingHttpHeaders = {};
      for (const [ key, value ] of response.headers) {
        headers[key.toLowerCase()] = value;
      }

      res.writeHead(response.status, headers);

      if (!response.body) {
        res.end();
        return;
      }
      pipeline(response.body, res, e => {
        if (e) {
          console.error(`pipeline writing response error for url ${response.url}`, e);
          res.end();
        }
      });
    };
  }

  static startHTTPServer(host: string, port: number, { listener, ...options }: StartHTTPServerOptions) {
    const serverListener = StandaloneTestUtil.#createHTTPServerListener(listener);
    const server = createServer(options ?? {}, serverListener);

    return new Promise<Server>(resolve => {
      server.listen(port, host, () => resolve(server));
    });
  }
}
