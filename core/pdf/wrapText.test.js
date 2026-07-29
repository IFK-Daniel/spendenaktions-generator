import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapText } from "./wrapText.js";

function fakeFont() {
  return { widthOfTextAtSize: (text, size) => text.length * size * 0.5 };
}

test("kurzer Text bleibt eine Zeile", () => {
  const font = fakeFont();
  const lines = wrapText({ font, text: "Kim Yu", sizePt: 10, maxWidthPt: 1000 });
  assert.deepEqual(lines, ["Kim Yu"]);
});

test("bricht an Wortgrenzen um, sobald die Zeile zu breit würde", () => {
  const font = fakeFont();
  // "eins" (4) "zwei" (4) "drei" (4) je + Leerzeichen bei size=10 -> Wortbreite=20, Leerzeichenbreite=5
  // maxWidth=45: "eins zwei" = 20+5+20=45 passt genau, "eins zwei drei" = 45+5+20=70 passt nicht.
  const lines = wrapText({ font, text: "eins zwei drei", sizePt: 10, maxWidthPt: 45 });
  assert.deepEqual(lines, ["eins zwei", "drei"]);
});

test("einzelnes zu breites Wort wird nicht innerhalb des Wortes getrennt", () => {
  const font = fakeFont();
  const lines = wrapText({ font, text: "Donaudampfschifffahrt kurz", sizePt: 10, maxWidthPt: 30 });
  assert.equal(lines[0], "Donaudampfschifffahrt");
  assert.equal(lines[1], "kurz");
});

test("leerer Text ergibt eine leere Zeile, kein leeres Array", () => {
  const font = fakeFont();
  assert.deepEqual(wrapText({ font, text: "", sizePt: 10, maxWidthPt: 100 }), [""]);
  assert.deepEqual(wrapText({ font, text: "   ", sizePt: 10, maxWidthPt: 100 }), [""]);
});
