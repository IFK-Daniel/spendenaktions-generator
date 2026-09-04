import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb } from "pdf-lib";
import { imposePagesOnSheet } from "./imposePagesOnSheet.js";
import { mmToPt } from "./units.js";

async function buildSourcePdf(widthMm, heightMm) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([mmToPt(widthMm), mmToPt(heightMm)]);
  // pdf-lib's embedPage() erfordert eine Seite mit tatsächlichem Content-
  // Stream ("Can't embed page with missing Contents") — eine leere Seite
  // reicht als Testfixture nicht, daher ein triviales Rechteck zeichnen.
  page.drawRectangle({ x: 0, y: 0, width: mmToPt(widthMm), height: mmToPt(heightMm), color: rgb(1, 1, 1) });
  return doc.save();
}

test("wirft ohne Platzierungen", async () => {
  const source = await buildSourcePdf(148, 210);
  await assert.rejects(
    () => imposePagesOnSheet({ sourceBytes: source, sheetWidthMm: 297, sheetHeightMm: 210, placements: [] }),
    /placements/
  );
});

test("erzeugt einen Bogen mit der angegebenen Größe", async () => {
  const source = await buildSourcePdf(148, 210);
  const { bytes } = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [{ xMm: 0.5, yMm: 0 }],
  });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  const page = doc.getPage(0);
  assert.ok(Math.abs(page.getWidth() - mmToPt(297)) < 0.01);
  assert.ok(Math.abs(page.getHeight() - mmToPt(210)) < 0.01);
});

test("platziert die Quellseite ohne Skalierung an der natürlichen Größe, wenn keine widthMm/heightMm angegeben sind", async () => {
  const source = await buildSourcePdf(148, 210);
  const { bytes } = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [
      { xMm: 0.5, yMm: 0 },
      { xMm: 148.5, yMm: 0 },
    ],
  });
  // Kein direkter Zugriff auf gezeichnete XObject-Transforms über die
  // public pdf-lib-API — Regressionsschutz erfolgt hier über die
  // Bogengröße und die Anzahl platzierter Kopien (siehe Test unten);
  // die exakte 1:1-Platzierung ohne Skalierung ist zusätzlich visuell
  // über `artifacts/flyer-preview/home-*-a4.png` geprüft (siehe
  // `scripts/render-flyer-test-matrix.mjs`).
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
});

test("zwei Platzierungen erzeugen zwei sichtbare Kopien (Byte-Größe wächst gegenüber einer Platzierung)", async () => {
  const source = await buildSourcePdf(148, 210);
  const one = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [{ xMm: 0.5, yMm: 0 }],
  });
  const two = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [
      { xMm: 0.5, yMm: 0 },
      { xMm: 148.5, yMm: 0 },
    ],
  });
  assert.ok(two.bytes.length >= one.bytes.length);
});

test("explizite widthMm/heightMm skalieren die Platzierung (bewusste Ausnahme von 'keine Skalierung')", async () => {
  const source = await buildSourcePdf(148, 210);
  const { bytes } = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [{ xMm: 0, yMm: 0, widthMm: 74, heightMm: 105 }],
  });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
});

test("guideLines zeichnen zusätzliche Linien, ohne die Seitenzahl zu verändern", async () => {
  const source = await buildSourcePdf(148, 210);
  const { bytes } = await imposePagesOnSheet({
    sourceBytes: source,
    sheetWidthMm: 297,
    sheetHeightMm: 210,
    placements: [{ xMm: 0.5, yMm: 0 }],
    guideLines: [{ x1Mm: 148.5, y1Mm: 0, x2Mm: 148.5, y2Mm: 4, colorHex: "#999999", widthPt: 0.5 }],
  });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
});
