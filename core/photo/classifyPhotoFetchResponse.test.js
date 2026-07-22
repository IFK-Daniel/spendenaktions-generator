import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPhotoFetchResponse } from "./classifyPhotoFetchResponse.js";

test("Status 200 mit Bild-Content-Type gilt als erfolgreich", () => {
  const result = classifyPhotoFetchResponse({ status: 200, contentType: "image/jpeg", redirected: false });
  assert.deepEqual(result, { ok: true, contentType: "image/jpeg" });
});

test("Content-Type-Prüfung ist unabhängig von Groß-/Kleinschreibung", () => {
  const result = classifyPhotoFetchResponse({ status: 200, contentType: "IMAGE/PNG", redirected: false });
  assert.equal(result.ok, true);
  assert.equal(result.contentType, "image/png");
});

test("404 gilt als http_error", () => {
  const result = classifyPhotoFetchResponse({ status: 404, contentType: "text/html", redirected: false });
  assert.deepEqual(result, { ok: false, reason: "http_error" });
});

test("403 gilt als http_error", () => {
  const result = classifyPhotoFetchResponse({ status: 403, contentType: "text/html", redirected: false });
  assert.deepEqual(result, { ok: false, reason: "http_error" });
});

test("HTML statt Bild ohne Weiterleitung gilt als invalid_content_type", () => {
  const result = classifyPhotoFetchResponse({ status: 200, contentType: "text/html", redirected: false });
  assert.deepEqual(result, { ok: false, reason: "invalid_content_type" });
});

test("HTML statt Bild NACH einer Weiterleitung gilt als redirect_login", () => {
  const result = classifyPhotoFetchResponse({ status: 200, contentType: "text/html", redirected: true });
  assert.deepEqual(result, { ok: false, reason: "redirect_login" });
});

test("fehlender Content-Type gilt als invalid_content_type", () => {
  const result = classifyPhotoFetchResponse({ status: 200, contentType: undefined, redirected: false });
  assert.deepEqual(result, { ok: false, reason: "invalid_content_type" });
});
