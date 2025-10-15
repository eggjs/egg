import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { InsufficientStorageError, E507 } from "../../src/index.ts";

describe("test/http/507.test.ts", () => {
  it("should instantiate", () => {
    const err = new InsufficientStorageError();
    assert(err.code === "INSUFFICIENT_STORAGE");
    assert(err.message === "Insufficient Storage");
    assert(err.name === "InsufficientStorageError");
    assert(err.status === 507);
  });

  it("should alias to short name E507", () => {
    const err = new E507();
    assert(err.code === "INSUFFICIENT_STORAGE");
    assert(err.message === "Insufficient Storage");
    assert(err.name === "InsufficientStorageError");
    assert(err.status === 507);
  });
});
