import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { UnorderedCollectionError, E425 } from "../../src/index.ts";

describe("test/http/425.test.ts", () => {
  it("should instantiate", () => {
    const err = new UnorderedCollectionError();
    assert(err.code === "UNORDERED_COLLECTION");
    assert(err.message === "Unordered Collection");
    assert(err.name === "UnorderedCollectionError");
    assert(err.status === 425);
  });

  it("should alias to short name E425", () => {
    const err = new E425();
    assert(err.code === "UNORDERED_COLLECTION");
    assert(err.message === "Unordered Collection");
    assert(err.name === "UnorderedCollectionError");
    assert(err.status === 425);
  });
});
