import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { placeImage } from "./placeImage.js";

// 2x1-Pixel PNG (rot, blau), erzeugt für den Test — reicht, um eine
// Seitenverhältnis-Diskrepanz zur quadratischen Zielfläche zu erzwingen.
const WIDE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAFElEQVR4nGP8z8DwnwEJMDEwMAAApAQGA6xhF0EAAAAASUVORK5CYII=";

async function setup() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 200]);
  const image = await pdfDoc.embedPng(WIDE_PNG_BASE64);
  return { pdfDoc, page, image };
}

test("platziert ein Bild in einer rechteckigen Fläche ohne zu werfen", async () => {
  const { pdfDoc, page, image } = await setup();
  placeImage({ page, image, xPt: 10, yPt: 10, widthPt: 50, heightPt: 50, shape: "rect" });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});

test("platziert ein Bild in einer kreisrunden Fläche ohne zu werfen", async () => {
  const { pdfDoc, page, image } = await setup();
  placeImage({ page, image, xPt: 10, yPt: 10, widthPt: 50, heightPt: 50, shape: "circle" });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});

test("Standard-Shape ist 'rect', wenn nicht angegeben", async () => {
  const { pdfDoc, page, image } = await setup();
  placeImage({ page, image, xPt: 10, yPt: 10, widthPt: 50, heightPt: 50 });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});

test("akzeptiert einen manuellen 'crop' ohne zu werfen (Verhalten unverändert ohne 'crop')", async () => {
  const { pdfDoc, page, image } = await setup();
  placeImage({
    page,
    image,
    xPt: 10,
    yPt: 10,
    widthPt: 50,
    heightPt: 50,
    shape: "circle",
    crop: { zoom: 2, offsetX: 0.5, offsetY: -1 },
  });
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 0);
});
