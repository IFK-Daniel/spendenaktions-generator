import { test } from "node:test";
import assert from "node:assert/strict";
import { fitText } from "./fitText.js";

// Monospace-Fake: jedes Zeichen ist genau `0.5 * size` breit.
function fakeFont() {
  return { widthOfTextAtSize: (text, size) => text.length * size * 0.5 };
}

test("Text, der bereits bei startSizePt passt, bleibt bei startSizePt", () => {
  const font = fakeFont();
  const result = fitText({ font, text: "Kim", maxWidthPt: 1000, startSizePt: 14, minSizePt: 6 });
  assert.equal(result.sizePt, 14);
  assert.equal(result.fits, true);
});

test("zu breiter Text wird bis zum Passen geschrumpft", () => {
  const font = fakeFont();
  // Breite bei size=14 für 10 Zeichen: 10*14*0.5=70 > maxWidth=50 -> muss schrumpfen.
  // Breite bei size=10: 10*10*0.5=50 <= 50 -> passt, liegt zwischen minSizePt(6) und startSizePt(14).
  const result = fitText({ font, text: "X".repeat(10), maxWidthPt: 50, startSizePt: 14, minSizePt: 6, stepPt: 0.5 });
  assert.ok(result.sizePt < 14);
  assert.ok(result.sizePt >= 6);
  assert.equal(result.fits, true);
});

test("passt der Text auch bei minSizePt nicht, wird minSizePt mit fits:false zurückgegeben (kein Trunkieren)", () => {
  const font = fakeFont();
  const result = fitText({ font, text: "X".repeat(100), maxWidthPt: 10, startSizePt: 14, minSizePt: 6 });
  assert.equal(result.sizePt, 6);
  assert.equal(result.fits, false);
});

test("wirft bei fehlender font.widthOfTextAtSize", () => {
  assert.throws(() => fitText({ font: {}, text: "a", maxWidthPt: 10, startSizePt: 10 }));
});
