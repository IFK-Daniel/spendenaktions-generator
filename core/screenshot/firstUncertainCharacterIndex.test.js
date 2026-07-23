import { test } from "node:test";
import assert from "node:assert/strict";
import { firstUncertainCharacterIndex } from "./firstUncertainCharacterIndex.js";

function char(c, uncertain) {
  return { char: c, uncertain };
}

test("liefert den Index des ersten unsicheren Zeichens", () => {
  const chars = [char("H", false), char("M", false), char("U", true), char("W", false)];
  assert.equal(firstUncertainCharacterIndex(chars), 2);
});

test("liefert den Index des jeweils ersten Treffers bei mehreren unsicheren Zeichen", () => {
  const chars = [char("A", false), char("B", true), char("C", true)];
  assert.equal(firstUncertainCharacterIndex(chars), 1);
});

test("liefert -1, wenn kein Zeichen unsicher ist", () => {
  assert.equal(firstUncertainCharacterIndex([char("A", false), char("B", false)]), -1);
});

test("liefert -1 für fehlende oder leere Eingabe", () => {
  assert.equal(firstUncertainCharacterIndex(undefined), -1);
  assert.equal(firstUncertainCharacterIndex([]), -1);
});
