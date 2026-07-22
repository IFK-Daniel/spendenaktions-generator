import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPhotoFetchException } from "./classifyPhotoFetchException.js";

test("AbortError (Timeout) wird als 'timeout' erkannt", () => {
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  assert.equal(classifyPhotoFetchException(err), "timeout");
});

test("andere Fehler (z. B. DNS/Verbindungsfehler) gelten als 'http_error'", () => {
  const err = new Error("getaddrinfo ENOTFOUND");
  err.name = "FetchError";
  assert.equal(classifyPhotoFetchException(err), "http_error");
});

test("Nicht-Error-Werte gelten als 'http_error'", () => {
  assert.equal(classifyPhotoFetchException(undefined), "http_error");
  assert.equal(classifyPhotoFetchException("irgendein String"), "http_error");
});
