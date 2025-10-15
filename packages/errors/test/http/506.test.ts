import { describe, it } from "vitest";

import { strict as assert } from "assert";
import { VariantAlsoNegotiatesError, E506 } from "../../src/index.ts";

describe("test/http/506.test.ts", () => {
  it("should instantiate", () => {
    const err = new VariantAlsoNegotiatesError();
    assert(err.code === "VARIANT_ALSO_NEGOTIATES");
    assert(err.message === "Variant Also Negotiates");
    assert(err.name === "VariantAlsoNegotiatesError");
    assert(err.status === 506);
  });

  it("should alias to short name E506", () => {
    const err = new E506();
    assert(err.code === "VARIANT_ALSO_NEGOTIATES");
    assert(err.message === "Variant Also Negotiates");
    assert(err.name === "VariantAlsoNegotiatesError");
    assert(err.status === 506);
  });
});
