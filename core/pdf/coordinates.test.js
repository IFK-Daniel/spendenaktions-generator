import { test } from "node:test";
import assert from "node:assert/strict";
import { trimCoordinateToPdfPoint } from "./coordinates.js";
import { mmToPt } from "./units.js";

test("obere linke Trim-Ecke (0,0) landet bei Beschnitt oben links im pdf-lib-Koordinatensystem", () => {
  const { xPt, yPt } = trimCoordinateToPdfPoint({ xMm: 0, yMm: 0, outputBleedMm: 3, outputHeightMm: 216 });
  assert.ok(Math.abs(xPt - mmToPt(3)) < 1e-9);
  assert.ok(Math.abs(yPt - mmToPt(216 - 3)) < 1e-9);
});

test("ohne Beschnitt (outputBleedMm=0) ist die Trim-Koordinate direkt die Seitenkoordinate", () => {
  const { xPt, yPt } = trimCoordinateToPdfPoint({ xMm: 10, yMm: 20, outputBleedMm: 0, outputHeightMm: 210 });
  assert.ok(Math.abs(xPt - mmToPt(10)) < 1e-9);
  assert.ok(Math.abs(yPt - mmToPt(190)) < 1e-9);
});

test("Y wächst nach unten (Trim) -> Y sinkt im pdf-lib-System (nach oben offen)", () => {
  const top = trimCoordinateToPdfPoint({ xMm: 0, yMm: 10, outputBleedMm: 0, outputHeightMm: 210 });
  const bottom = trimCoordinateToPdfPoint({ xMm: 0, yMm: 50, outputBleedMm: 0, outputHeightMm: 210 });
  assert.ok(bottom.yPt < top.yPt);
});
