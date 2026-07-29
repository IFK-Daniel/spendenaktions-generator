import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { placeMultiLineText } from "./placeMultiLineText.js";

async function setup() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { pdfDoc, page, font };
}

test("kurzer Text bleibt eine Zeile bei startSizePt", async () => {
  const { page, font } = await setup();
  const result = placeMultiLineText({
    page,
    font,
    text: "Kurzer Text",
    xPt: 10,
    yPt: 390,
    maxWidthPt: 300,
    startSizePt: 12,
    minSizePt: 6,
    color: rgb(0, 0, 0),
  });
  assert.equal(result.lines.length, 1);
  assert.equal(result.sizePt, 12);
});

test("bricht um, wenn Auto-Shrink allein nicht reicht (maxHeightPt begrenzt)", async () => {
  const { page, font } = await setup();
  const longText = "Dies ist ein deutlich längerer Beispieltext, der in eine schmale Spalte passen muss.";
  const result = placeMultiLineText({
    page,
    font,
    text: longText,
    xPt: 10,
    yPt: 390,
    maxWidthPt: 80,
    maxHeightPt: 200,
    startSizePt: 12,
    minSizePt: 6,
    color: rgb(0, 0, 0),
  });
  assert.ok(result.lines.length > 1);
});

test("priorisiert Auto-Shrink vor Umbruch: bei ausreichend Höhe bleibt möglichst eine Zeile", async () => {
  const { page, font } = await setup();
  const result = placeMultiLineText({
    page,
    font,
    text: "EinWortOhneLeerzeichenDasNichtUmbrechenKann",
    xPt: 10,
    yPt: 390,
    maxWidthPt: 100,
    maxHeightPt: 20,
    startSizePt: 12,
    minSizePt: 4,
    color: rgb(0, 0, 0),
  });
  // Ein einzelnes Wort kann nicht umgebrochen werden -> muss eine Zeile bleiben,
  // Auto-Shrink reduziert stattdessen die Schriftgröße.
  assert.equal(result.lines.length, 1);
  assert.ok(result.sizePt < 12);
});
