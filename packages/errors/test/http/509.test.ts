import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { BandwidthLimitExceededError, E509 } from "../../src/index.ts";

describe("test/http/509.test.ts", () => {
  it("should instantiate", () => {
    const err = new BandwidthLimitExceededError();
    assert(err.code === "BANDWIDTH_LIMIT_EXCEEDED");
    assert(err.message === "Bandwidth Limit Exceeded");
    assert(err.name === "BandwidthLimitExceededError");
    assert(err.status === 509);
  });

  it("should alias to short name E509", () => {
    const err = new E509();
    assert(err.code === "BANDWIDTH_LIMIT_EXCEEDED");
    assert(err.message === "Bandwidth Limit Exceeded");
    assert(err.name === "BandwidthLimitExceededError");
    assert(err.status === 509);
  });
});
