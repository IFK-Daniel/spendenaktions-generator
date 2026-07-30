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

// Monospace-Fake mit fester Aufstiegshöhe, unabhängig von `page.drawText` —
// erlaubt es, die tatsächlich gezeichnete Y-Position zu prüfen (reines
// pdf-lib-`PDFPage` liefert dafür keine einfache Introspektion).
function fakeFontWithAscent(ascentPt) {
  return {
    widthOfTextAtSize: (text, size) => text.length * size * 0.5,
    heightAtSize: () => ascentPt,
  };
}

function fakePage(drawCalls) {
  return { drawText: (text, opts) => drawCalls.push({ text, ...opts }) };
}

test("verticalAlign 'top' (Default) verhält sich wie bisher: Textblock beginnt an der Oberkante", () => {
  const font = fakeFontWithAscent(10);
  const drawCalls = [];
  const page = fakePage(drawCalls);
  placeMultiLineText({
    page,
    font,
    text: "Kurz",
    xPt: 0,
    yPt: 100,
    maxWidthPt: 200,
    maxHeightPt: 50,
    startSizePt: 12,
    minSizePt: 12,
    color: { r: 0, g: 0, b: 0 },
  });
  assert.equal(drawCalls.length, 1);
  // baselineYPt = yPt - ascentPt - 0*lineHeightPt = 100 - 10 = 90
  assert.equal(drawCalls[0].y, 90);
});

test("verticalAlign 'middle' zentriert den Textblock vertikal in maxHeightPt", () => {
  const font = fakeFontWithAscent(10);
  const drawCalls = [];
  const page = fakePage(drawCalls);
  // Eine Zeile bei size=12, lineHeightFactor=1.2 -> lineHeightPt=14.4, blockHeightPt=14.4.
  placeMultiLineText({
    page,
    font,
    text: "Kurz",
    xPt: 0,
    yPt: 100,
    maxWidthPt: 200,
    maxHeightPt: 50,
    startSizePt: 12,
    minSizePt: 12,
    color: { r: 0, g: 0, b: 0 },
    verticalAlign: "middle",
  });
  // blockTopYPt = yPt - (maxHeightPt - blockHeightPt)/2 = 100 - (50-14.4)/2 = 100 - 17.8 = 82.2
  // baselineYPt = blockTopYPt - ascentPt = 82.2 - 10 = 72.2
  assert.equal(drawCalls.length, 1);
  assert.ok(Math.abs(drawCalls[0].y - 72.2) < 1e-9);
});

test("verticalOffsetPt verschiebt die Baseline zusätzlich additiv (positiv = nach oben)", () => {
  const font = fakeFontWithAscent(10);
  const drawCalls = [];
  const page = fakePage(drawCalls);
  placeMultiLineText({
    page,
    font,
    text: "Kurz",
    xPt: 0,
    yPt: 100,
    maxWidthPt: 200,
    maxHeightPt: 50,
    startSizePt: 12,
    minSizePt: 12,
    color: { r: 0, g: 0, b: 0 },
    verticalAlign: "middle",
    verticalOffsetPt: 5,
  });
  // Wie im 'middle'-Test oben (baselineYPt ohne Offset = 72.2), plus verticalOffsetPt = 5.
  assert.ok(Math.abs(drawCalls[0].y - 77.2) < 1e-9);
});

test("verticalOffsetPt ist standardmäßig 0 (kein Verhaltensunterschied ohne explizite Angabe)", () => {
  const font = fakeFontWithAscent(10);
  const drawCalls = [];
  const page = fakePage(drawCalls);
  placeMultiLineText({
    page,
    font,
    text: "Kurz",
    xPt: 0,
    yPt: 100,
    maxWidthPt: 200,
    startSizePt: 12,
    minSizePt: 12,
    color: { r: 0, g: 0, b: 0 },
  });
  assert.equal(drawCalls[0].y, 90);
});

test("verticalAlign 'middle' ohne endliche maxHeightPt verhält sich wie 'top'", () => {
  const font = fakeFontWithAscent(10);
  const drawCalls = [];
  const page = fakePage(drawCalls);
  placeMultiLineText({
    page,
    font,
    text: "Kurz",
    xPt: 0,
    yPt: 100,
    maxWidthPt: 200,
    startSizePt: 12,
    minSizePt: 12,
    color: { r: 0, g: 0, b: 0 },
    verticalAlign: "middle",
  });
  assert.equal(drawCalls[0].y, 90);
});
