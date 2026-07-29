import { test } from "node:test";
import assert from "node:assert/strict";
import { mmToPt, ptToMm } from "./units.js";

test("mmToPt rechnet 25.4mm in 72pt um (1 Zoll)", () => {
  assert.ok(Math.abs(mmToPt(25.4) - 72) < 1e-9);
});

test("ptToMm ist die Umkehrfunktion von mmToPt", () => {
  const original = 44.7;
  assert.ok(Math.abs(ptToMm(mmToPt(original)) - original) < 1e-9);
});
