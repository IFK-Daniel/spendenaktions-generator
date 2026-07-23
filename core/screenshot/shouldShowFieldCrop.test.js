import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowFieldCrop } from "./shouldShowFieldCrop.js";

test("needs_review mit Bounding-Box zeigt einen Ausschnitt", () => {
  assert.equal(shouldShowFieldCrop({ status: "needs_review", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }), true);
});

test("needs_review ohne Bounding-Box zeigt keinen Ausschnitt", () => {
  assert.equal(shouldShowFieldCrop({ status: "needs_review" }), false);
});

test("recognized zeigt keinen Ausschnitt, auch mit Bounding-Box", () => {
  assert.equal(shouldShowFieldCrop({ status: "recognized", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }), false);
});

test("confirmed_empty zeigt keinen Ausschnitt", () => {
  assert.equal(shouldShowFieldCrop({ status: "confirmed_empty", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }), false);
});

test("not_recognized zeigt keinen Ausschnitt", () => {
  assert.equal(shouldShowFieldCrop({ status: "not_recognized" }), false);
});

test("fehlendes Feld zeigt keinen Ausschnitt", () => {
  assert.equal(shouldShowFieldCrop(null), false);
  assert.equal(shouldShowFieldCrop(undefined), false);
});
