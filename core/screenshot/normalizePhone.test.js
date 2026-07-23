import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./normalizePhone.js";

test("führende/abschließende Leerzeichen werden entfernt", () => {
  assert.equal(normalizePhone("  0170 1234567  "), "0170 1234567");
});

test("mehrfache innere Leerzeichen werden zusammengefasst", () => {
  assert.equal(normalizePhone("0170   1234567"), "0170 1234567");
});

test("keine Umschreibung der Formatierung", () => {
  assert.equal(normalizePhone("+49 170 1234567"), "+49 170 1234567");
});
