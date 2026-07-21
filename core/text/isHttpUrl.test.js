import { test } from "node:test";
import assert from "node:assert/strict";
import { isHttpUrl } from "./isHttpUrl.js";

test("akzeptiert eine https-URL", () => {
  assert.equal(isHttpUrl("https://example.com/foto.jpg"), true);
});

test("akzeptiert eine http-URL", () => {
  assert.equal(isHttpUrl("http://example.com/foto.jpg"), true);
});

test("lehnt eine URL mit anderem Protokoll ab", () => {
  assert.equal(isHttpUrl("ftp://example.com/foto.jpg"), false);
});

test("lehnt einen leeren String ab", () => {
  assert.equal(isHttpUrl(""), false);
  assert.equal(isHttpUrl("   "), false);
});

test("lehnt Freitext ohne gültige URL-Struktur ab", () => {
  assert.equal(isHttpUrl("kein-link"), false);
});

test("lehnt Nicht-Strings ab", () => {
  assert.equal(isHttpUrl(undefined), false);
  assert.equal(isHttpUrl(null), false);
  assert.equal(isHttpUrl(123), false);
});

test("toleriert umgebende Leerzeichen", () => {
  assert.equal(isHttpUrl("  https://example.com/foto.jpg  "), true);
});
