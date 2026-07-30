import { test } from "node:test";
import assert from "node:assert/strict";
import { isIfkIdComplete } from "./isIfkIdComplete.js";

test("gültige IFK-ID gilt als erledigt", () => {
  assert.equal(isIfkIdComplete("IFK7QX"), true);
});

test("gültige, kleingeschriebene IFK-ID gilt ebenfalls als erledigt", () => {
  assert.equal(isIfkIdComplete("ifk7qx"), true);
});

test("leeres Feld gilt nicht als erledigt", () => {
  assert.equal(isIfkIdComplete(""), false);
  assert.equal(isIfkIdComplete("   "), false);
});

test("ungültige IFK-ID gilt nicht als erledigt", () => {
  assert.equal(isIfkIdComplete("IFK-7QX"), false);
  assert.equal(isIfkIdComplete("nichtgueltig"), false);
});

test("Nicht-String-Werte gelten nicht als erledigt", () => {
  assert.equal(isIfkIdComplete(null), false);
  assert.equal(isIfkIdComplete(undefined), false);
});
