import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGender } from "./normalizeGender.js";

test("männlich wird zu male normalisiert", () => {
  assert.deepEqual(normalizeGender("männlich"), { value: "male", status: "recognized" });
  assert.deepEqual(normalizeGender("Mann"), { value: "male", status: "recognized" });
  assert.deepEqual(normalizeGender("Male"), { value: "male", status: "recognized" });
});

test("weiblich wird zu female normalisiert", () => {
  assert.deepEqual(normalizeGender("weiblich"), { value: "female", status: "recognized" });
  assert.deepEqual(normalizeGender("Frau"), { value: "female", status: "recognized" });
  assert.deepEqual(normalizeGender("Female"), { value: "female", status: "recognized" });
});

test("unbekannter Wert wird nicht geraten, sondern als prüfbedürftig markiert", () => {
  assert.deepEqual(normalizeGender("divers"), { value: "", status: "needs_review" });
});

test("fehlender Wert gilt als nicht erkannt", () => {
  assert.deepEqual(normalizeGender(""), { value: "", status: "not_recognized" });
  assert.deepEqual(normalizeGender(undefined), { value: "", status: "not_recognized" });
});
