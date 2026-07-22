import { test } from "node:test";
import assert from "node:assert/strict";
import { guessAttachmentMimeType } from "./guessAttachmentMimeType.js";

test("erkennt .png", () => {
  assert.equal(guessAttachmentMimeType("IFK_Max_Mustermann_PayPal_QR_gruen.png"), "image/png");
});

test("erkennt .pdf", () => {
  assert.equal(guessAttachmentMimeType("IFK_Max_Mustermann_Flyer_Home.pdf"), "application/pdf");
});

test("erkennt .zip", () => {
  assert.equal(guessAttachmentMimeType("IFK_Materialien_IFK7QX_Max_Mustermann.zip"), "application/zip");
});

test("ist unabhängig von Groß-/Kleinschreibung der Endung", () => {
  assert.equal(guessAttachmentMimeType("bild.PNG"), "image/png");
});

test("liefert application/octet-stream bei unbekannter Endung", () => {
  assert.equal(guessAttachmentMimeType("datei.xyz"), "application/octet-stream");
});

test("liefert application/octet-stream ohne Endung oder Nicht-String", () => {
  assert.equal(guessAttachmentMimeType("datei-ohne-endung"), "application/octet-stream");
  assert.equal(guessAttachmentMimeType(undefined), "application/octet-stream");
});
