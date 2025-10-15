import path from "node:path";
import net, { Server } from "node:net";
import { detect } from "detect-port";

import coffee from "../../coffee.ts";
import { getRootDirname, getFixtures } from "../../helper.ts";

describe("test/commands/dev/detect-port.test.ts", () => {
  let server: Server;
  let serverPort: number;
  before(async () => {
    serverPort = await detect(7001);
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(serverPort, resolve);
    });
  });

  after(() => server.close());

  it("should auto detect available port", () => {
    const eggBin = path.join(getRootDirname(), "bin/run.js");
    const cwd = getFixtures("demo-app");

    return (
      coffee
        .fork(eggBin, ["dev"], {
          cwd,
          env: { EGG_BIN_DEFAULT_PORT: String(serverPort) },
        })
        // .debug()
        .expect(
          "stderr",
          /\[@eggjs\/bin] server port \d+ is unavailable, now using port \d+/,
        )
        .expect("code", 0)
        .end()
    );
  });
});
