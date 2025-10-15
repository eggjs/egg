import path from "node:path";
import fs from "node:fs/promises";
import { scheduler } from "node:timers/promises";

import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
} from "vitest";
import coffee from "coffee";
import { request } from "urllib";
import { mm, restore } from "mm";
import { detectPort } from "detect-port";

import { cleanup, replaceWeakRefMessage, type Coffee } from "./utils.ts";

// const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe("test/start-without-demon-1.test.ts", () => {
  const eggBin = path.join(__dirname, "../bin/run.js");
  const fixturePath = path.join(__dirname, "fixtures/example");
  const homePath = path.join(__dirname, "fixtures/home-start-without-demon");
  const waitTime = 10000;

  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
  });
  beforeEach(() => mm(process.env, "MOCK_HOME_DIR", homePath));
  afterEach(restore);

  describe("read pkgInfo on CommonJS", () => {
    let app: Coffee;
    let fixturePath: string;

    beforeAll(async () => {
      fixturePath = path.join(__dirname, "fixtures/pkg-config");
      await cleanup(fixturePath);
    });

    afterAll(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should --require work", async () => {
      app = coffee.fork(
        eggBin,
        ["start", "--workers=1", "--require=./inject2.js"],
        {
          cwd: fixturePath,
        },
      ) as Coffee;
      app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/@@@ inject script!/);
      expect(app.stdout).toMatch(/@@@ inject script1/);
      expect(app.stdout).toMatch(/@@@ inject script2/);
    });

    it("inject incorrect script", async () => {
      const script = "./inject3.js";
      app = coffee.fork(
        eggBin,
        ["start", "--workers=1", `--require=${script}`],
        {
          cwd: fixturePath,
        },
      ) as Coffee;
      // app.debug();
      await scheduler.wait(waitTime);
      expect(app.stderr).toMatch(/Cannot find module/);
      app.expect("code", 1);
    });
  });

  describe("read pkgInfo on ESM", () => {
    let app: Coffee;
    let fixturePath: string;

    beforeAll(async () => {
      fixturePath = path.join(__dirname, "fixtures/pkg-config-esm");
      await cleanup(fixturePath);
    });

    afterAll(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should --require work", async () => {
      app = coffee.fork(
        eggBin,
        ["start", "--workers=1", "--require=./inject2.js"],
        {
          cwd: fixturePath,
        },
      ) as Coffee;
      // app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      expect(app.stdout).toMatch(/@@@ inject script!/);
      expect(app.stdout).toMatch(/@@@ inject script1/);
      expect(app.stdout).toMatch(/@@@ inject script2/);
    });

    it("inject incorrect script", async () => {
      const script = "./inject3.js";
      app = coffee.fork(
        eggBin,
        ["start", "--workers=1", `--require=${script}`],
        { cwd: fixturePath },
      ) as Coffee;
      // app.debug();
      await scheduler.wait(waitTime);
      expect(app.stderr).toMatch(/Cannot find module/);
      app.expect("code", 1);
    });
  });

  describe("sourcemap default value should respect eggScriptConfig", () => {
    let app: Coffee;
    let fixturePath: string;

    beforeAll(async () => {
      fixturePath = path.join(__dirname, "fixtures/pkg-config-sourcemap");
      await cleanup(fixturePath);
    });

    afterAll(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should not enable sourcemap-support", async () => {
      app = coffee.fork(eggBin, ["start", "--workers=1"], {
        cwd: fixturePath,
      }) as Coffee;
      // app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);
      expect(app.stdout).not.toMatch(
        /--require .*\/node_modules\/.*source-map-support/,
      );
    });
  });

  describe("full path", () => {
    let app: Coffee;

    beforeAll(async () => {
      await cleanup(fixturePath);
    });

    afterEach(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should start", async () => {
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        `--port=${port}`,
        fixturePath,
      ]) as Coffee;
      app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      // assert(!app.stdout.includes('DeprecationWarning:'));
      expect(app.stdout).toMatch(/--title=egg-server-example/);
      expect(app.stdout).toMatch(/"title":"egg-server-example"/);
      expect(app.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:\d+/,
      );
      expect(app.stdout).toMatch(/app_worker#2:/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });

    it("should start --trace-warnings work", async () => {
      app = coffee.fork(eggBin, [
        "start",
        "--workers=1",
        path.join(__dirname, "fixtures/trace-warnings"),
      ]) as Coffee;
      // app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      // assert.match(app.stderr, /MaxListenersExceededWarning:/);
      // assert.match(app.stderr, /app.js:10:9/); // should had trace
      expect(app.stdout).not.toMatch(/DeprecationWarning:/);
    });

    it.skip("should get ready", async () => {
      app = coffee.fork(
        path.join(__dirname, "./fixtures/ipc-bin/start.js"),
        [],
        {
          env: {
            BASE_DIR: fixturePath,
            PATH: process.env.PATH,
          },
        },
      ) as Coffee;
      // app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      expect(app.stdout).toMatch(/READY!!!/);
      expect(app.stdout).toMatch(/--title=egg-server-example/);
      expect(app.stdout).toMatch(/"title":"egg-server-example"/);
      expect(app.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:7001/,
      );
      expect(app.stdout).toMatch(/app_worker#2:/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
    });
  });
});
