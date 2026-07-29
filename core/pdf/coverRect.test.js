import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb } from "pdf-lib";
import { coverRect } from "./coverRect.js";

test("zeichnet ein Rechteck ohne zu werfen und erzeugt gültige PDF-Bytes", async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 200]);
  coverRect({ page, xPt: 10, yPt: 10, widthPt: 50, heightPt: 20, color: rgb(1, 1, 1) });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});
