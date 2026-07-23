import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRepresentativeDataFromScreenshot } from "./extractRepresentativeDataFromScreenshot.js";

const FAKE_FILE = { name: "screenshot.png" };

const VALID_LINES = [
  { text: "Vorname", confidence: 95 },
  { text: "Daniel", confidence: 93 },
  { text: "Nachname", confidence: 95 },
  { text: "Feigenbutz", confidence: 93 },
  { text: "IFK-Mailadresse", confidence: 90 },
  { text: "d.feigenbutz@its-for-kids.de", confidence: 90 },
];

test("gültiger Screenshot liefert erkannte Felder", async () => {
  const result = await extractRepresentativeDataFromScreenshot({
    file: FAKE_FILE,
    mimeType: "image/png",
    runOcr: async () => ({ lines: VALID_LINES }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.fields.firstName.value, "Daniel");
  assert.equal(result.fields.emailForForm.value, "d.feigenbutz@its-for-kids.de");
  assert.equal(result.fields.ifkId.status, "not_recognized");
});

test("ungültiger Dateityp wird abgelehnt", async () => {
  const result = await extractRepresentativeDataFromScreenshot({
    file: FAKE_FILE,
    mimeType: "application/pdf",
    runOcr: async () => ({ lines: VALID_LINES }),
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_mime_type" });
});

test("fehlendes Bild wird abgelehnt", async () => {
  const result = await extractRepresentativeDataFromScreenshot({
    file: null,
    mimeType: "image/png",
    runOcr: async () => ({ lines: VALID_LINES }),
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_image" });
});

test("Timeout wird als solcher erkannt", async () => {
  const result = await extractRepresentativeDataFromScreenshot({
    file: FAKE_FILE,
    mimeType: "image/png",
    timeoutMs: 10,
    runOcr: () => new Promise((resolve) => setTimeout(() => resolve({ lines: VALID_LINES }), 1000)),
  });
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("OCR-Fehler wird abgebildet", async () => {
  const result = await extractRepresentativeDataFromScreenshot({
    file: FAKE_FILE,
    mimeType: "image/png",
    runOcr: async () => {
      throw new Error("OCR engine crashed");
    },
  });
  assert.deepEqual(result, { ok: false, reason: "ocr_error" });
});
