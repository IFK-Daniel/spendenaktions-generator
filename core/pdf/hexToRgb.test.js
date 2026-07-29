import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToRgb } from "./hexToRgb.js";

test("wandelt #494D4D korrekt um", () => {
  const { red, green, blue } = hexToRgb("#494D4D");
  assert.ok(Math.abs(red - 0x49 / 255) < 1e-6);
  assert.ok(Math.abs(green - 0x4d / 255) < 1e-6);
  assert.ok(Math.abs(blue - 0x4d / 255) < 1e-6);
});

test("funktioniert auch ohne führendes '#'", () => {
  assert.deepEqual(hexToRgb("FFFFFF"), hexToRgb("#FFFFFF"));
});

test("wirft bei ungültigem Format", () => {
  assert.throws(() => hexToRgb("nope"));
  assert.throws(() => hexToRgb(""));
  assert.throws(() => hexToRgb(undefined));
});
