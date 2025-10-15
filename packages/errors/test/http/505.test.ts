import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { HTTPVersionNotSupportedError, E505 } from "../../src/index.ts";

describe("test/http/505.test.ts", () => {
  it("should instantiate", () => {
    const err = new HTTPVersionNotSupportedError();
    assert(err.code === "HTTP_VERSION_NOT_SUPPORTED");
    assert(err.message === "HTTP Version Not Supported");
    assert(err.name === "HTTPVersionNotSupportedError");
    assert(err.status === 505);
  });

  it("should alias to short name E505", () => {
    const err = new E505();
    assert(err.code === "HTTP_VERSION_NOT_SUPPORTED");
    assert(err.message === "HTTP Version Not Supported");
    assert(err.name === "HTTPVersionNotSupportedError");
    assert(err.status === 505);
  });
});
