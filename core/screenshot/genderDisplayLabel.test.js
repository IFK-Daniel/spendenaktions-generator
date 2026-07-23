import { test } from "node:test";
import assert from "node:assert/strict";
import { genderDisplayLabel } from "./genderDisplayLabel.js";

test("male wird als männlich angezeigt", () => {
  assert.equal(genderDisplayLabel("male"), "männlich");
});

test("female wird als weiblich angezeigt", () => {
  assert.equal(genderDisplayLabel("female"), "weiblich");
});

test("leerer oder unbekannter Wert wird unverändert zurückgegeben", () => {
  assert.equal(genderDisplayLabel(""), "");
  assert.equal(genderDisplayLabel("divers"), "divers");
});
