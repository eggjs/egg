import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const startLocalServer = (ip = '127.0.0.1'): Promise<string> => {
  let localServer: http.Server | null = null;
  process.once('exit', () => {
    if (localServer && localServer.listening) {
      localServer.close();
    }
  });

  return new Promise((resolve, reject) => {
    if (localServer) {
      const address = localServer.address();
      const port = typeof address === 'string' ? address : address?.port;
      return resolve(`http://${ip}:` + port);
    }
    let retry = false;

    const requestHandler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      const method = req.method || 'GET';
      const url = req.url || '/';
      const path = url.split('?')[0];

      // /get_headers: 返回请求头
      if (path === '/get_headers') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(req.headers));
        return;
      }

      // /timeout: 延时 10s 再返回
      if (path === '/timeout') {
        await sleep(10000);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`${method} ${path}`);
        return;
      }

      // /error: 500 错误
      if (path === '/error') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('this is an error');
        return;
      }

      // /retry: 第一次 500，第二次 200 并带上 x-retry 头
      if (path === '/retry') {
        if (!retry) {
          retry = true;
          res.statusCode = 500;
          res.end();
        } else {
          retry = false;
          res.statusCode = 200;
          res.setHeader('x-retry', '1');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('retry suc');
        }
        return;
      }

      // 默认返回 method + path
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`${method} ${path}`);
    };

    localServer = http.createServer((req, res) => {
      // 支持 async 处理函数
      Promise.resolve(requestHandler(req, res)).catch((err: any) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(err && err.message ? err.message : 'internal error');
      });
    });

    localServer.listen(0, (err?: Error) => {
      if (err) return reject(err);
      const address = localServer!.address();
      const port = typeof address === 'string' ? address : address?.port;
      return resolve(`http://${ip}:` + port);
    });
  });
};
