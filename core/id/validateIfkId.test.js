import { test } from "node:test";
import assert from "node:assert/strict";
import { validateIfkId } from "./validateIfkId.js";

test("gültige ID wird akzeptiert", () => {
  const result = validateIfkId("IFK7QX");
  assert.equal(result.valid, true);
  assert.equal(result.normalized, "IFK7QX");
  assert.equal(result.reason, "valid");
});

test("Kleinbuchstaben werden normalisiert und als gültig erkannt", () => {
  const result = validateIfkId("ifk7qx");
  assert.equal(result.valid, true);
  assert.equal(result.normalized, "IFK7QX");
});

test("gemischte Groß-/Kleinschreibung wird normalisiert und als gültig erkannt", () => {
  const result = validateIfkId("IfK7qX");
  assert.equal(result.valid, true);
  assert.equal(result.normalized, "IFK7QX");
});

test("Leerzeichen innerhalb der ID machen sie ungültig", () => {
  const result = validateIfkId("IF K7QX");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "contains-whitespace");
});

test("führendes Leerzeichen macht die ID ungültig", () => {
  const result = validateIfkId(" IFK7QX");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "contains-whitespace");
});

test("nachgestelltes Leerzeichen macht die ID ungültig", () => {
  const result = validateIfkId("IFK7QX ");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "contains-whitespace");
});

test("ungültige Zeichen (0) machen die ID ungültig", () => {
  const result = validateIfkId("IFK70X");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-characters");
});

test("ungültige Zeichen (I und O) machen die ID ungültig", () => {
  const result = validateIfkId("IFKIOA");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-characters");
});

test("Trennzeichen machen die ID ungültig (falsche Länge)", () => {
  const result = validateIfkId("IFK-7QX");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-length");
});

test("zu kurze ID ist ungültig", () => {
  const result = validateIfkId("IFK7Q");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-length");
});

test("zu lange ID ist ungültig", () => {
  const result = validateIfkId("IFK7QXA");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-length");
});

test("falsches Präfix macht die ID ungültig", () => {
  const result = validateIfkId("ABC7QX");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid-prefix");
});

test("leere Zeichenkette ist ungültig", () => {
  const result = validateIfkId("");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "empty");
});

test("Nicht-String-Eingaben sind ungültig", () => {
  assert.equal(validateIfkId(null).valid, false);
  assert.equal(validateIfkId(undefined).valid, false);
  assert.equal(validateIfkId(123456).valid, false);
  assert.equal(validateIfkId({}).valid, false);
  assert.equal(validateIfkId(null).reason, "invalid-type");
});
