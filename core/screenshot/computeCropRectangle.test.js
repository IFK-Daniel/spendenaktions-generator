import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCropRectangle } from "./computeCropRectangle.js";

test("berechnet ein vergrößertes Rechteck mit Rand um die Bounding-Box", () => {
  const rect = computeCropRectangle({ x0: 100, y0: 100, x1: 200, y1: 130 }, 1000, 1000);
  assert.ok(rect.x < 100);
  assert.ok(rect.y < 100);
  assert.ok(rect.x + rect.width > 200);
  assert.ok(rect.y + rect.height > 130);
});

test("wird am linken/oberen Bildrand geklammert", () => {
  const rect = computeCropRectangle({ x0: 5, y0: 5, x1: 50, y1: 25 }, 1000, 1000);
  assert.ok(rect.x >= 0);
  assert.ok(rect.y >= 0);
});

test("wird am rechten/unteren Bildrand geklammert", () => {
  const rect = computeCropRectangle({ x0: 950, y0: 980, x1: 995, y1: 998 }, 1000, 1000);
  assert.ok(rect.x + rect.width <= 1000);
  assert.ok(rect.y + rect.height <= 1000);
});

test("fehlende Bounding-Box liefert null", () => {
  assert.equal(computeCropRectangle(undefined, 1000, 1000), null);
  assert.equal(computeCropRectangle(null, 1000, 1000), null);
});

test("unvollständige Bounding-Box liefert null", () => {
  assert.equal(computeCropRectangle({ x0: 1, y0: 1, x1: 10 }, 1000, 1000), null);
});

test("Bounding-Box ohne positive Breite/Höhe liefert null", () => {
  assert.equal(computeCropRectangle({ x0: 10, y0: 10, x1: 10, y1: 20 }, 1000, 1000), null);
  assert.equal(computeCropRectangle({ x0: 10, y0: 10, x1: 20, y1: 10 }, 1000, 1000), null);
});

test("ungültige Bilddimensionen liefern null", () => {
  assert.equal(computeCropRectangle({ x0: 1, y0: 1, x1: 10, y1: 10 }, 0, 1000), null);
  assert.equal(computeCropRectangle({ x0: 1, y0: 1, x1: 10, y1: 10 }, 1000, -5), null);
});
