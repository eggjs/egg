# helloworld-service-worker

A minimal `@eggjs/service-worker` application with an HTTP controller and an
MCP tool in the same tegg module.

## Start locally

```bash
# From the monorepo root
ut install --from pnpm
cd examples/helloworld-service-worker
npm run start
```

Try the HTTP controller:

```bash
curl 'http://127.0.0.1:7001/hello/?name=you'
# {"message":"hello, you"}
```

Try the MCP tool:

```bash
curl -X POST 'http://127.0.0.1:7001/mcp/calc/stream' \
  -H 'accept: application/json, text/event-stream' \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add","arguments":{"a":1,"b":41}}}'
```

## Project structure

- `app/` contains the tegg module and its HTTP, MCP, and service classes.
- `main.ts` starts a local `node:http` server.
- `worker.ts` exports a Cloudflare module worker.
- `wrangler.jsonc` points Cloudflare Workers at the generated bundle.

## Run on Cloudflare Workers

Build the worker before running or deploying it with Wrangler:

```bash
npm run bundle:cf
npx wrangler dev
# npx wrangler deploy
```

The bundle is written to `.worker-cf/index.mjs`. The `nodejs_compat`
compatibility flag in `wrangler.jsonc` provides the Node.js APIs required by
tegg.

## Test

```bash
npm test
```
