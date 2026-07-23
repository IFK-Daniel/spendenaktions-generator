import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyExtractionException } from "./classifyExtractionException.js";

test("AbortError gilt als Timeout", () => {
  const err = new Error("aborted");
  err.name = "AbortError";
  assert.equal(classifyExtractionException(err), "timeout");
});

test("sonstige Fehler gelten als OCR-Fehler", () => {
  assert.equal(classifyExtractionException(new Error("boom")), "ocr_error");
});
