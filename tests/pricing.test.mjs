import test from "node:test";
import assert from "node:assert/strict";
import { splitSale } from "../src/utils/pricing.js";

test("one test AVAX sale leaves 90% for the seller and 10% for the platform", () => {
  assert.deepEqual(splitSale("1"), {
    seller: 900000000000000000n,
    platform: 100000000000000000n,
    total: 1000000000000000000n,
  });
});
test("small amounts are conserved, with rounding remainder going to the seller", () => {
  assert.deepEqual(splitSale("0.000000000000000019"), {
    seller: 18n,
    platform: 1n,
    total: 19n,
  });
});
test("invalid or negative prices are rejected instead of displaying misleading earnings", () => {
  for (const value of ["-1", "no price", "Infinity", "1.0000000000000000001"])
    assert.throws(() => splitSale(value));
});
