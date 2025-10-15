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
import { isWindows } from "../src/helper.ts";

const __dirname = import.meta.dirname;

describe("test/stop.test.ts", () => {
  const eggBin = path.join(__dirname, "../bin/run.js");
  const fixturePath = path.join(__dirname, "fixtures/example-stop");
  const timeoutPath = path.join(__dirname, "fixtures/stop-timeout");
  const homePath = path.join(__dirname, "fixtures/home");
  const logDir = path.join(homePath, "logs");
  const waitTime = 10000;

  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
  });
  beforeEach(() => mm(process.env, "MOCK_HOME_DIR", homePath));
  afterEach(restore);

  describe("stop without daemon", () => {
    let app: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        "--title=egg-server-example-stop",
        `--port=${port}`,
        fixturePath,
      ]) as Coffee;
      // app.debug();
      app.expect("code", 0);
      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      expect(app.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:\d+/,
      );
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });

    afterEach(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should stop", async () => {
      killer = coffee.fork(eggBin, [
        "stop",
        "--title=egg-server-example-stop",
        fixturePath,
      ]) as Coffee;
      // killer.debug();
      killer.expect("code", 0);
      await killer.end();

      // make sure is kill not auto exist
      expect(app.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app.stdout).toMatch(/\[master] exit with code:0/);
        expect(app.stdout).toMatch(/\[app_worker] exit with code:0/);
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      expect(killer.stdout).toMatch(/stopping egg application/);
      expect(killer.stdout).toMatch(/got master pid \[\d+\]/);
    });
  });

  describe("stop with daemon", () => {
    beforeEach(async () => {
      await cleanup(fixturePath);
      await fs.rm(logDir, { force: true, recursive: true });
      const port = await detectPort();
      await coffee
        .fork(eggBin, [
          "start",
          "--daemon",
          "--workers=2",
          `--port=${port}`,
          fixturePath,
        ])
        // .debug()
        .expect("code", 0)
        .end();

      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });
    afterEach(async () => {
      await cleanup(fixturePath);
    });

    it("should stop", async () => {
      await coffee
        .fork(eggBin, ["stop", "--title=egg-server-example-stop", fixturePath])
        .debug()
        .expect("stdout", /stopping egg application/)
        .expect("stdout", /got master pid \[\d+\]/i)
        .expect("code", 0)
        .end();

      // master log
      const stdout = await fs.readFile(
        path.join(logDir, "master-stdout.log"),
        "utf-8",
      );

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(stdout).toMatch(/\[master] exit with code:0/);
        expect(stdout).toMatch(/\[app_worker] exit with code:0/);
      }

      await coffee
        .fork(eggBin, ["stop", "--title=egg-server-example-stop", fixturePath])
        .debug()
        .expect("stderr", /can't detect any running egg process/)
        .expect("code", 0)
        .end();
    });
  });

  describe("stop with not exist", () => {
    it("should work", async () => {
      await cleanup(fixturePath);
      await coffee
        .fork(eggBin, ["stop", "--title=egg-server-example-stop", fixturePath])
        // .debug()
        .expect("stdout", /stopping egg application/)
        .expect("stderr", /can't detect any running egg process/)
        .expect("code", 0)
        .end();
    });
  });

  describe("stop --title", () => {
    let app: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        "--title=example-stop",
        `--port=${port}`,
        fixturePath,
      ]) as Coffee;
      // app.debug();
      app.expect("code", 0);
      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      expect(app.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:\d+/,
      );
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });

    afterEach(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should stop only if the title matches exactly", async () => {
      // Because of'exmaple'.inclues('exmap') === true，if egg-scripts <= 2.1.0 and you run `.. stop --title=exmap`，the process with 'title:example' will also be killed unexpectedly
      await coffee
        .fork(eggBin, ["stop", "--title=examp", fixturePath])
        // .debug()
        .expect("stdout", /stopping egg application with --title=examp/)
        .expect("stderr", /can't detect any running egg process/)
        .expect("code", 0)
        .end();

      // stop only if the title matches exactly
      await coffee
        .fork(eggBin, ["stop", "--title=example-stop", fixturePath])
        // .debug()
        .expect("stdout", /stopping egg application with --title=example-stop/)
        .expect("stdout", /got master pid \[/)
        .expect("code", 0)
        .end();
    });

    it("should stop", async () => {
      await coffee
        .fork(eggBin, ["stop", "--title=random", fixturePath])
        .debug()
        .expect("stdout", /stopping egg application with --title=random/)
        .expect("stderr", /can't detect any running egg process/)
        .expect("code", 0)
        .end();

      killer = coffee.fork(eggBin, ["stop", "--title=example-stop"], {
        cwd: fixturePath,
      }) as Coffee;
      killer.debug();
      // killer.expect('code', 0);
      await killer.end();

      // make sure is kill not auto exist
      expect(app.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app.stdout).toMatch(/\[master] exit with code:0/);
        expect(app.stdout).toMatch(/\[app_worker] exit with code:0/);
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      expect(killer.stdout).toMatch(
        /stopping egg application with --title=example/,
      );
      expect(killer.stdout).toMatch(/got master pid \[\d+\]/i);
    });
  });

  describe("stop all", () => {
    let app: Coffee;
    let app2: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        "--title=example-stop",
        `--port=${port}`,
        fixturePath,
      ]) as Coffee;
      app.debug();
      app.expect("code", 0);

      const port2 = await detectPort();
      app2 = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        "--title=example-stop-test",
        `--port=${port2}`,
        fixturePath,
      ]) as Coffee;
      app2.expect("code", 0);

      await scheduler.wait(10000);

      expect(replaceWeakRefMessage(app.stderr)).toBe("");
      expect(app.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:\d+/,
      );
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");

      expect(replaceWeakRefMessage(app2.stderr)).toBe("");
      expect(app2.stdout).toMatch(
        /custom-framework started on http:\/\/127\.0\.0\.1:\d+/,
      );
      const result2 = await request(`http://127.0.0.1:${port2}`);
      expect(result2.data.toString()).toBe("hi, egg");
    });

    afterEach(async () => {
      app.proc.kill("SIGTERM");
      app2.proc.kill("SIGTERM");
      await cleanup(fixturePath);
    });

    it("should stop", async () => {
      killer = coffee.fork(eggBin, ["stop"], { cwd: fixturePath }) as Coffee;
      killer.debug();
      // killer.expect('code', 0);
      await killer.end();

      // make sure is kill not auto exist
      expect(app.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app.stdout).toMatch(/\[master] exit with code:0/);
        expect(app.stdout).toMatch(/\[app_worker] exit with code:0/);
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      expect(killer.stdout).toMatch(/stopping egg application/);
      expect(killer.stdout).toMatch(/got master pid \[\d+,\d+\]/i);

      expect(app2.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app2.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app2.stdout).toMatch(/\[master] exit with code:0/);
        expect(app2.stdout).toMatch(/\[app_worker] exit with code:0/);
      }
    });
  });

  describe("stop all with timeout", () => {
    let app: Coffee;
    let killer: Coffee;
    beforeEach(async () => {
      await cleanup(timeoutPath);
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        "start",
        "--workers=2",
        "--title=stop-timeout",
        `--port=${port}`,
        timeoutPath,
      ]) as Coffee;
      // app.debug();
      app.expect("code", 0);

      await scheduler.wait(waitTime);

      // assert.equal(replaceWeakRefMessage(app.stderr), '');
      expect(app.stdout).toMatch(/http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });

    afterEach(async () => {
      app.proc.kill("SIGTERM");
      await cleanup(timeoutPath);
    });

    it("should stop error without timeout", async () => {
      killer = coffee.fork(eggBin, ["stop"], { cwd: timeoutPath }) as Coffee;
      killer.debug();
      killer.expect("code", 0);
      await killer.end();
      await scheduler.wait(waitTime);

      // make sure is kill not auto exist
      expect(app.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app.stdout).toMatch(/app_worker#\d+:\d+ disconnect/);
        expect(app.stdout).toMatch(
          /don't fork, because worker:\d+ will be kill soon/,
        );
      }

      expect(killer.stdout).toMatch(/stopping egg application/);
      expect(killer.stdout).toMatch(/got master pid \[\d+\]/i);
    });

    it("should stop success", async () => {
      killer = coffee.fork(eggBin, ["stop", "--timeout=10000"], {
        cwd: timeoutPath,
      }) as Coffee;
      killer.debug();
      killer.expect("code", 0);

      // await killer.end();
      await scheduler.wait(waitTime);

      // make sure is kill not auto exist
      expect(app.stdout).not.toMatch(/exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        expect(app.stdout).toMatch(
          /\[master] master is killed by signal SIGTERM, closing/,
        );
        expect(app.stdout).toMatch(/\[master] exit with code:0/);
        expect(app.stdout).toMatch(/\[agent_worker] exit with code:0/);
      }

      expect(killer.stdout).toMatch(/stopping egg application/);
      expect(killer.stdout).toMatch(/got master pid \[\d+\]/i);
    });
  });

  // may get Error: EPERM: operation not permitted on windows
  describe.skipIf(isWindows)("stop with symlink", () => {
    const baseDir = path.join(__dirname, "fixtures/tmp");

    beforeEach(async () => {
      await fs.symlink(fixturePath, baseDir, "dir");

      // *unix get the real path of symlink, but windows wouldn't
      const appPathInRegexp = isWindows
        ? baseDir.replace(/\\/g, "\\\\")
        : fixturePath;

      await cleanup(fixturePath);
      await fs.rm(logDir, { force: true, recursive: true });
      const port = await detectPort();
      await coffee
        .fork(
          eggBin,
          [
            "start",
            "--daemon",
            "--workers=2",
            "--title=egg-server-example-stop",
            `--port=${port}`,
          ],
          {
            cwd: baseDir,
          },
        )
        .debug()
        .expect(
          "stdout",
          new RegExp(
            `Starting custom-framework application at ${appPathInRegexp}`,
          ),
        )
        .expect("code", 0)
        .end();

      await fs.rm(baseDir, { force: true, recursive: true });
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe("hi, egg");
    });

    afterEach(async () => {
      await cleanup(fixturePath);
      await fs.rm(baseDir, { force: true, recursive: true });
    });

    it("should stop", async () => {
      await fs.rm(baseDir, { force: true, recursive: true });
      await fs.symlink(path.join(__dirname, "fixtures/status"), baseDir);

      await coffee
        .fork(eggBin, ["stop", "--title=egg-server-example-stop", baseDir])
        .debug()
        .expect("stdout", /stopping egg application/)
        .expect("stdout", /got master pid \[\d+\]/i)
        .expect("code", 0)
        .end();
    });
  });
});
