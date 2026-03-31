# Egg.js Startup Snapshot - Test Plan

## Overview

This document describes the test strategy for the Node.js V8 startup snapshot feature in Egg.js. The snapshot feature allows pre-compiling the framework into a V8 snapshot blob, drastically reducing cold-start time for production deployments.

### Feature Flow

```
Build Phase:    eggctl snapshot-build → scan modules → esbuild bundle to CJS → node --build-snapshot → snapshot.blob
Runtime Phase:  eggctl start --snapshot-blob snapshot.blob → node --snapshot-blob → app starts with pre-loaded modules
```

### Dependencies

- Node.js >= 22 (V8 startup snapshot support)
- `--build-snapshot` / `--snapshot-blob` Node.js flags
- Single process mode (`--single` flag in egg-scripts)

---

## 1. Unit Tests

### 1.1 egg-scripts: Single Mode Start/Stop

**File:** `tools/scripts/test/start-single.test.ts`

| #   | Test Case                   | Description                                                                          |
| --- | --------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Start app in single mode    | `eggctl start --single --port=<port>` starts successfully, sends `egg-ready` message |
| 2   | Serve HTTP requests         | App started in single mode responds to HTTP requests correctly                       |
| 3   | Graceful shutdown (SIGTERM) | Sending SIGTERM to single-mode process triggers graceful shutdown                    |
| 4   | Graceful shutdown (SIGINT)  | Sending SIGINT to single-mode process triggers graceful shutdown                     |
| 5   | Port configuration          | `--port` flag is respected in single mode                                            |
| 6   | Daemon mode with single     | `--single --daemon` starts in background, detaches correctly                         |
| 7   | Workers flag ignored        | `--workers` flag is silently ignored in single mode                                  |
| 8   | Custom framework            | Single mode works with custom framework path                                         |

**Test Pattern:**

```typescript
// Uses coffee to spawn eggctl process, detect-port for dynamic ports,
// urllib to verify HTTP responses
import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { request } from 'urllib';

it('should start app in single mode', async () => {
  const port = await detectPort();
  await coffee
    .fork(eggBin, ['start', '--single', `--port=${port}`, fixturePath])
    .expect('stdout', /single process mode/)
    .expect('code', 0)
    .end();
  const result = await request(`http://127.0.0.1:${port}`);
  assert.equal(result.status, 200);
});
```

### 1.2 egg-scripts: Snapshot Build Command

**File:** `tools/scripts/test/snapshot-build.test.ts`

| #   | Test Case                    | Description                                                               |
| --- | ---------------------------- | ------------------------------------------------------------------------- |
| 1   | Build snapshot blob          | `eggctl snapshot-build` creates snapshot blob file                        |
| 2   | Snapshot blob is valid       | Generated blob file is non-empty and has expected binary header           |
| 3   | Build exits after completion | Process exits with code 0 after building snapshot (does not start server) |
| 4   | Custom blob path             | `--snapshot-blob=custom.blob` writes to specified path                    |
| 5   | Start from snapshot          | `eggctl start --snapshot-blob=<path>` starts the app from the blob       |

### 1.3 egg Lifecycle: Metadata-Only Mode

**File:** `packages/egg/test/snapshot-lifecycle.test.ts`

| #   | Test Case                 | Description                                                                                     |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Metadata-only loading     | When `snapshotMode: 'build'` is set, framework loads plugins/config but does not start services |
| 2   | Serializable state        | After metadata-only loading, framework state can be captured by V8 snapshot                     |
| 3   | No server listening       | In snapshot build mode, no HTTP server is created                                               |
| 4   | Restore completes startup | After snapshot restore, remaining lifecycle phases execute and app becomes ready                |

### 1.4 Koa: Snapshot Serialize/Deserialize Round-Trip

**File:** `packages/koa/test/snapshot.test.ts`

| #   | Test Case                    | Description                                                              |
| --- | ---------------------------- | ------------------------------------------------------------------------ |
| 1   | Koa app survives snapshot    | Koa instance created before snapshot can handle requests after restore   |
| 2   | Middleware chain preserved   | Middleware registered before snapshot fires correctly after restore      |
| 3   | Context extensions preserved | Custom context properties survive snapshot round-trip                    |
| 4   | No active handles leak       | Koa app in snapshot mode doesn't hold active handles that block snapshot |

---

## 2. Integration Tests

### 2.1 Full Snapshot Workflow

**File:** `tools/scripts/test/snapshot-integration.test.ts`

These tests use the `helloworld-typescript` example or a dedicated fixture app.

| #   | Test Case                        | Description                                                                |
| --- | -------------------------------- | -------------------------------------------------------------------------- |
| 1   | Build snapshot of example app    | Build snapshot blob from helloworld-typescript, verify blob file created   |
| 2   | Start app from snapshot          | Start app using `--snapshot-blob=egg-snapshot.blob`, verify it serves HTTP |
| 3   | Response correctness             | App started from snapshot returns same response as cold-started app        |
| 4   | Graceful shutdown from snapshot  | App started from snapshot handles SIGTERM gracefully                       |
| 5   | Startup time comparison          | Snapshot startup is measurably faster than cold start (>30% improvement)   |
| 6   | Multiple restarts from same blob | Same snapshot blob can be used to start the app multiple times             |

**Test Pattern:**

```typescript
describe('snapshot integration', () => {
  const fixturePath = path.join(__dirname, 'fixtures/snapshot-app');
  let blobPath: string;

  beforeAll(async () => {
    blobPath = path.join(fixturePath, 'egg-snapshot.blob');
    // Step 1: Build the snapshot
    await coffee
      .fork(eggBin, ['start', '--single', '--build-snapshot', fixturePath])
      .expect('code', 0)
      .end();
    assert(await exists(blobPath), 'snapshot blob should be created');
  });

  afterAll(async () => {
    await cleanup(fixturePath);
    await fs.rm(blobPath, { force: true });
  });

  it('should start from snapshot and serve requests', async () => {
    const port = await detectPort();
    // Start with snapshot
    const child = spawn('node', [
      `--snapshot-blob=${blobPath}`,
      startSingleBin,
      JSON.stringify({ baseDir: fixturePath, port, framework: 'egg' }),
    ]);

    // Wait for ready
    await waitForReady(child);

    const result = await request(`http://127.0.0.1:${port}`);
    assert.equal(result.status, 200);

    // Cleanup
    child.kill('SIGTERM');
  });

  it('should start faster from snapshot than cold start', async () => {
    const port1 = await detectPort();
    const port2 = await detectPort(port1 + 1);

    // Cold start timing
    const coldStart = Date.now();
    const cold = await startAndWait(fixturePath, port1, { snapshot: false });
    const coldTime = Date.now() - coldStart;
    cold.kill('SIGTERM');

    // Snapshot start timing
    const snapStart = Date.now();
    const snap = await startAndWait(fixturePath, port2, { snapshot: blobPath });
    const snapTime = Date.now() - snapStart;
    snap.kill('SIGTERM');

    console.log(`Cold start: ${coldTime}ms, Snapshot start: ${snapTime}ms`);
    console.log(`Speedup: ${((1 - snapTime / coldTime) * 100).toFixed(1)}%`);

    // Snapshot should be at least 30% faster
    assert(snapTime < coldTime * 0.7,
      `Snapshot (${snapTime}ms) should be >30% faster than cold (${coldTime}ms)`);
  });
});
```

### 2.2 Snapshot Fixture App

Create a minimal fixture app at `tools/scripts/test/fixtures/snapshot-app/` that:

- Has a simple controller returning JSON with timestamp
- Has minimal config (port, keys)
- Uses the egg framework from workspace
- Can be built into a snapshot and started from it

**Structure:**

```
tools/scripts/test/fixtures/snapshot-app/
  ├── app/
  │   ├── controller/
  │   │   └── home.ts
  │   └── router.ts
  ├── config/
  │   └── config.default.ts
  └── package.json
```

---

## 3. E2E Tests for CI

### 3.1 GitHub Actions Workflow

**File:** `.github/workflows/ci.yml` (new job added)

Add a `test-snapshot` job to the existing CI workflow:

```yaml
test-snapshot:
  name: Test snapshot (ubuntu, ${{ matrix.node }})
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      node: ['22', '24']

  concurrency:
    group: test-snapshot-${{ github.workflow }}-#${{ github.event.pull_request.number || github.head_ref || github.ref }}-${{ matrix.node }}
    cancel-in-progress: true

  steps:
    - name: Checkout repository
      uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

    - name: Install pnpm
      uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061 # v4

    - name: Set up Node.js
      uses: actions/setup-node@6044e13b5dc448c55e2357c09f80417699197238 # v6
      with:
        node-version: ${{ matrix.node }}
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Build all packages
      run: pnpm build

    - name: Run snapshot tests
      run: |
        pnpm run --filter=./tools/scripts test -- snapshot.test.ts
      env:
        NODE_OPTIONS: '--max-old-space-size=4096'

    - name: Upload snapshot blob on failure
      if: failure()
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
      with:
        name: snapshot-blob-${{ matrix.node }}
        path: tools/scripts/test/fixtures/snapshot-app/*.blob
        retention-days: 3
```

### 3.2 Design Decisions

**Why add to `ci.yml` instead of a separate workflow?**

- The existing CI already has dedicated jobs for `test-egg-scripts` which is the closest related test suite
- Adding a `test-snapshot` job keeps all CI in one workflow with the shared `done` gate job
- Snapshot tests only need Node.js 22+ (no need for Node 20 matrix entry)
- No external services (Redis/MySQL) needed — simpler than E2E

**Why Ubuntu-only?**

- V8 snapshot blobs are platform-specific (cannot cross-compile)
- Snapshot support is most stable on Linux
- macOS/Windows support can be added later once Linux is proven
- This matches `test-egg-scripts` which is also Ubuntu-only

**Why Node.js 22 and 24?**

- Node.js 22 is the minimum version with stable startup snapshot support
- Node.js 24 tests forward compatibility
- Node.js 20 does not have mature snapshot support

### 3.3 `done` Job Update

The `done` job must include `test-snapshot` in its `needs` array:

```yaml
done:
  runs-on: ubuntu-latest
  needs:
    - test
    - test-egg-bin
    - test-egg-scripts
    - test-snapshot    # <-- add this
    - typecheck
```

---

## 4. Test Utilities

### 4.1 Helper Functions

Add to `tools/scripts/test/utils.ts`:

```typescript
/**
 * Wait for a child process to emit 'egg-ready' via IPC message.
 * Times out after `timeoutMs` (default 30s).
 */
export function waitForReady(child: ChildProcess, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for egg-ready after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('message', (msg: any) => {
      if (msg?.action === 'egg-ready') {
        clearTimeout(timer);
        resolve();
      }
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

/**
 * Measure startup time: spawn process and wait for egg-ready.
 * Returns elapsed milliseconds and the ChildProcess.
 */
export async function measureStartup(
  eggBin: string,
  args: string[],
  options: SpawnOptions,
): Promise<{ elapsed: number; child: ChildProcess }> {
  const start = Date.now();
  const child = spawn('node', args, { ...options, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  await waitForReady(child);
  return { elapsed: Date.now() - start, child };
}
```

---

## 5. Test Matrix Summary

| Category             | File                                              | Tests  | Node.js | OS     | Services |
| -------------------- | ------------------------------------------------- | ------ | ------- | ------ | -------- |
| Unit: single mode    | `tools/scripts/test/start-single.test.ts`         | 8      | 22, 24  | ubuntu | none     |
| Unit: snapshot build | `tools/scripts/test/snapshot-build.test.ts`       | 5      | 22, 24  | ubuntu | none     |
| Unit: lifecycle      | `packages/egg/test/snapshot-lifecycle.test.ts`    | 4      | 22, 24  | all    | none     |
| Unit: koa snapshot   | `packages/koa/test/snapshot.test.ts`              | 4      | 22, 24  | all    | none     |
| Integration          | `tools/scripts/test/snapshot-integration.test.ts` | 6      | 22, 24  | ubuntu | none     |
| **Total**            |                                                   | **27** |         |        |          |

---

## 6. Implementation Order

1. **Phase 1 (now):** Write this test plan, design CI workflow
2. **Phase 2 (after tasks #3, #4 complete):** Implement snapshot-build and start-single unit tests
3. **Phase 3 (after tasks #5, #6 complete):** Implement lifecycle and koa snapshot unit tests
4. **Phase 4 (all tasks done):** Implement integration tests with timing comparison
5. **Phase 5:** Add `test-snapshot` job to CI workflow

---

## 7. Fixture App Requirements

The snapshot test fixture app needs to be:

- **Minimal:** Only a home controller returning JSON, to isolate snapshot behavior
- **Self-contained:** No database, Redis, or external service dependencies
- **Deterministic:** Response includes a marker proving the snapshot was used (e.g., a build timestamp baked into the snapshot vs. runtime timestamp)
- **Fast:** Small dependency tree to keep snapshot build times reasonable in CI

Example controller:

```typescript
// app/controller/home.ts
import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index(): Promise<void> {
    this.ctx.body = {
      message: 'Hello from Egg.js',
      pid: process.pid,
      uptime: process.uptime(),
    };
  }
}
```

---

## 8. Risk and Mitigation

| Risk                                    | Impact                                           | Mitigation                                                    |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Snapshot blob is platform-specific      | CI tests pass on Linux but fail locally on macOS | Document platform limitation; don't commit blobs              |
| V8 snapshot API is experimental         | API may change between Node.js versions          | Pin minimum Node.js 22; test on 22 and 24                     |
| Timing tests are flaky                  | CI machines have variable performance            | Use relative comparison (>30% faster) not absolute thresholds |
| Snapshot build takes too long           | CI timeout                                       | Set generous timeout (120s); cache if needed                  |
| Snapshot incompatible with some plugins | Plugins with native bindings may fail            | Test with minimal plugin set first; document limitations      |
