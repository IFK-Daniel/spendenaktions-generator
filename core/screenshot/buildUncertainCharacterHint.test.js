import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUncertainCharacterHint } from "./buildUncertainCharacterHint.js";

function char(c, uncertain) {
  return { char: c, uncertain };
}

test("ein unsicheres Zeichen liefert die Singular-Formulierung", () => {
  const chars = [char("H", false), char("M", false), char("U", true), char("W", false)];
  assert.equal(buildUncertainCharacterHint(chars), "Bitte insbesondere das erkannte „U“ prüfen.");
});

test("mehrere unterschiedliche unsichere Zeichen liefern die Plural-Formulierung", () => {
  const chars = [char("A", true), char("B", false), char("C", true)];
  assert.equal(buildUncertainCharacterHint(chars), "Bitte insbesondere die erkannten Zeichen „A“, „C“ prüfen.");
});

test("doppelte unsichere Zeichen werden nur einmal genannt", () => {
  const chars = [char("U", true), char("x", false), char("U", true)];
  assert.equal(buildUncertainCharacterHint(chars), "Bitte insbesondere das erkannte „U“ prüfen.");
});

test("keine unsicheren Zeichen liefert null", () => {
  assert.equal(buildUncertainCharacterHint([char("A", false), char("B", false)]), null);
});

test("fehlende oder leere Eingabe liefert null", () => {
  assert.equal(buildUncertainCharacterHint(undefined), null);
  assert.equal(buildUncertainCharacterHint([]), null);
});

test("unsicheres Leerzeichen wird nicht genannt", () => {
  assert.equal(buildUncertainCharacterHint([char(" ", true)]), null);
});
