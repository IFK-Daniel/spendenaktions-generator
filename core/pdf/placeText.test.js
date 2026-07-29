import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { placeText } from "./placeText.js";

async function setup() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 200]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { pdfDoc, page, font };
}

test("zeichnet Text bei startSizePt, wenn er passt", async () => {
  const { page, font } = await setup();
  const result = placeText({
    page,
    font,
    text: "Kim",
    xPt: 10,
    yPt: 190,
    maxWidthPt: 150,
    startSizePt: 14,
    minSizePt: 6,
    color: rgb(0, 0, 0),
  });
  assert.equal(result.sizePt, 14);
  assert.equal(result.fits, true);
});

test("schrumpft zu breiten Text automatisch", async () => {
  const { page, font } = await setup();
  const result = placeText({
    page,
    font,
    text: "Ein sehr sehr sehr langer Name für das Feld",
    xPt: 10,
    yPt: 190,
    maxWidthPt: 60,
    startSizePt: 14,
    minSizePt: 6,
    color: rgb(0, 0, 0),
  });
  assert.ok(result.sizePt < 14);
});

test("erzeugt gültige PDF-Bytes ohne zu werfen", async () => {
  const { pdfDoc, page, font } = await setup();
  placeText({ page, font, text: "Test", xPt: 10, yPt: 190, maxWidthPt: 150, startSizePt: 10, color: rgb(0, 0, 0) });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});
