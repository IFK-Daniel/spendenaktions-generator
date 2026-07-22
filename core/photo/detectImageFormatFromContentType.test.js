import { test } from "node:test";
import assert from "node:assert/strict";
import { detectImageFormatFromContentType } from "./detectImageFormatFromContentType.js";

test("erkennt JPEG", () => {
  assert.equal(detectImageFormatFromContentType("image/jpeg"), "JPEG");
  assert.equal(detectImageFormatFromContentType("image/jpg"), "JPEG");
});

test("erkennt PNG", () => {
  assert.equal(detectImageFormatFromContentType("image/png"), "PNG");
});

test("erkennt WebP", () => {
  assert.equal(detectImageFormatFromContentType("image/webp"), "WebP");
});

test("erkennt GIF und SVG", () => {
  assert.equal(detectImageFormatFromContentType("image/gif"), "GIF");
  assert.equal(detectImageFormatFromContentType("image/svg+xml"), "SVG");
});

test("ignoriert einen Charset-Zusatz im Content-Type", () => {
  assert.equal(detectImageFormatFromContentType("image/png; charset=binary"), "PNG");
});

test("liefert die Groß-Schreibung der Endung für unbekannte Bildtypen", () => {
  assert.equal(detectImageFormatFromContentType("image/avif"), "AVIF");
});

test("liefert 'Unbekannt' bei fehlendem oder nicht-Bild-Content-Type", () => {
  assert.equal(detectImageFormatFromContentType("text/html"), "Unbekannt");
  assert.equal(detectImageFormatFromContentType(undefined), "Unbekannt");
});
