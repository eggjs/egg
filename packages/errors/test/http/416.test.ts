import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { RangeNotSatisfiableError, E416 } from "../../src/index.ts";

describe("test/http/416.test.ts", () => {
  it("should instantiate", () => {
    const err = new RangeNotSatisfiableError();
    assert(err.code === "RANGE_NOT_SATISFIABLE");
    assert(err.message === "Range Not Satisfiable");
    assert(err.name === "RangeNotSatisfiableError");
    assert(err.status === 416);
  });

  it("should alias to short name E416", () => {
    const err = new E416();
    assert(err.code === "RANGE_NOT_SATISFIABLE");
    assert(err.message === "Range Not Satisfiable");
    assert(err.name === "RangeNotSatisfiableError");
    assert(err.status === 416);
  });
});
