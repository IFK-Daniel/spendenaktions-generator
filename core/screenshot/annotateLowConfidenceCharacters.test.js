import { test } from "node:test";
import assert from "node:assert/strict";
import { annotateLowConfidenceCharacters } from "./annotateLowConfidenceCharacters.js";

function symbol(text, confidence) {
  return { text, confidence };
}

test("alle Zeichen sicher: keines wird als unsicher markiert", () => {
  const chars = annotateLowConfidenceCharacters("ABC", [symbol("A", 98), symbol("B", 99), symbol("C", 97)]);
  assert.deepEqual(
    chars.map((c) => c.uncertain),
    [false, false, false]
  );
});

test("nur das tatsächlich unsichere Zeichen wird markiert (reales Beispiel HMUW statt HMJW)", () => {
  const chars = annotateLowConfidenceCharacters(
    "HMUW",
    [symbol("H", 98), symbol("M", 99), symbol("U", 87), symbol("W", 98)]
  );
  assert.deepEqual(
    chars.map((c) => ({ char: c.char, uncertain: c.uncertain })),
    [
      { char: "H", uncertain: false },
      { char: "M", uncertain: false },
      { char: "U", uncertain: true },
      { char: "W", uncertain: false },
    ]
  );
});

test("Leerzeichen werden übersprungen und gelten immer als sicher", () => {
  const chars = annotateLowConfidenceCharacters("A B", [symbol("A", 98), symbol("B", 40)]);
  assert.equal(chars[1].char, " ");
  assert.equal(chars[1].uncertain, false);
  assert.equal(chars[2].uncertain, true);
});

test("fehlende Symbole liefern undefined (Fallback auf grobe Bewertung)", () => {
  assert.equal(annotateLowConfidenceCharacters("ABC", undefined), undefined);
  assert.equal(annotateLowConfidenceCharacters("ABC", []), undefined);
});

test("nicht übereinstimmende Zeichen-/Symbolanzahl liefert undefined", () => {
  assert.equal(annotateLowConfidenceCharacters("ABCD", [symbol("A", 98), symbol("B", 99)]), undefined);
});

test("leerer Text liefert undefined", () => {
  assert.equal(annotateLowConfidenceCharacters("", [symbol("A", 98)]), undefined);
});
