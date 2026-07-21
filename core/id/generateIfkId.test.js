import { test } from "node:test";
import assert from "node:assert/strict";
import { generateIfkId, IFK_ID_ALPHABET, IFK_ID_LENGTH, IFK_ID_PREFIX } from "./generateIfkId.js";
import { validateIfkId } from "./validateIfkId.js";

test("generateIfkId liefert eine ID mit Präfix IFK und Länge 6", () => {
  const id = generateIfkId();
  assert.equal(id.startsWith(IFK_ID_PREFIX), true);
  assert.equal(id.length, IFK_ID_LENGTH);
});

test("generateIfkId liefert ausschließlich Großbuchstaben, keine Leer-/Trennzeichen", () => {
  const id = generateIfkId();
  assert.equal(id, id.toUpperCase());
  assert.equal(/\s/.test(id), false);
  assert.equal(id.includes("-"), false);
  assert.equal(id.includes("_"), false);
});

test("generateIfkId verwendet ausschließlich das definierte Alphabet", () => {
  const suffixCharset = new Set(IFK_ID_ALPHABET.split(""));
  for (let i = 0; i < 200; i += 1) {
    const id = generateIfkId();
    const suffix = id.slice(IFK_ID_PREFIX.length);
    for (const char of suffix) {
      assert.equal(suffixCharset.has(char), true, `Unerlaubtes Zeichen "${char}" in ID "${id}"`);
    }
  }
});

test("generateIfkId schließt verwechselbare Zeichen I, O, 0, 1 im Suffix aus", () => {
  for (let i = 0; i < 200; i += 1) {
    const id = generateIfkId();
    const suffix = id.slice(IFK_ID_PREFIX.length);
    assert.equal(suffix.includes("I"), false);
    assert.equal(suffix.includes("O"), false);
    assert.equal(suffix.includes("0"), false);
    assert.equal(suffix.includes("1"), false);
  }
});

test("Zufallsgenerator erzeugt ausschließlich gültige IDs (validateIfkId)", () => {
  for (let i = 0; i < 200; i += 1) {
    const id = generateIfkId();
    const result = validateIfkId(id);
    assert.equal(result.valid, true, `generierte ID "${id}" wurde als ungültig bewertet: ${result.reason}`);
    assert.equal(result.normalized, id);
  }
});
