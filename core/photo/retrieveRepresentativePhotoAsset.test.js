import { test } from "node:test";
import assert from "node:assert/strict";
import { retrieveRepresentativePhotoAsset } from "./retrieveRepresentativePhotoAsset.js";

function fakeResponse({ status, contentType, redirected = false, body = "fake-image-bytes" }) {
  const bytes = new TextEncoder().encode(body);
  return {
    status,
    redirected,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => bytes.buffer,
  };
}

test("ruft den Foto-Link genau einmal ab (kein zweiter HTTP-Abruf)", async () => {
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    return fakeResponse({ status: 200, contentType: "image/jpeg" });
  };

  await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/foto.jpg", fetchImpl });

  assert.equal(callCount, 1);
});

test("liefert bei Erfolg ein In-Memory-Asset mit Inhalt, Größe, Format und Content-Type", async () => {
  const fetchImpl = async () => fakeResponse({ status: 200, contentType: "image/png", body: "png-bytes" });

  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/foto.png", fetchImpl });

  assert.equal(result.ok, true);
  assert.ok(result.asset.content instanceof Uint8Array);
  assert.equal(new TextDecoder().decode(result.asset.content), "png-bytes");
  assert.equal(result.asset.size, result.asset.content.byteLength);
  assert.equal(result.asset.format, "PNG");
  assert.equal(result.asset.contentType, "image/png");
});

test("öffentlich erreichbares Bild: image/jpeg mit Status 200 gilt als Erfolg", async () => {
  const fetchImpl = async () => fakeResponse({ status: 200, contentType: "image/jpeg" });
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/foto.jpg", fetchImpl });
  assert.equal(result.ok, true);
});

test("404 liefert reason 'http_error'", async () => {
  const fetchImpl = async () => fakeResponse({ status: 404, contentType: "text/html" });
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/nicht-da.jpg", fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "http_error" });
});

test("403 liefert reason 'http_error'", async () => {
  const fetchImpl = async () => fakeResponse({ status: 403, contentType: "text/html" });
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/verboten.jpg", fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "http_error" });
});

test("HTML statt Bild ohne Weiterleitung liefert reason 'invalid_content_type'", async () => {
  const fetchImpl = async () => fakeResponse({ status: 200, contentType: "text/html", redirected: false });
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/seite.html", fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "invalid_content_type" });
});

test("HTML statt Bild NACH Weiterleitung liefert reason 'redirect_login'", async () => {
  const fetchImpl = async () => fakeResponse({ status: 200, contentType: "text/html", redirected: true });
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/geschuetzt.jpg", fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "redirect_login" });
});

test("Timeout (AbortError) liefert reason 'timeout'", async () => {
  const fetchImpl = async () => {
    const err = new Error("The operation was aborted.");
    err.name = "AbortError";
    throw err;
  };

  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://example.com/langsam.jpg", fetchImpl });

  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("ein anderer Netzwerkfehler liefert reason 'http_error'", async () => {
  const fetchImpl = async () => {
    throw new Error("getaddrinfo ENOTFOUND");
  };
  const result = await retrieveRepresentativePhotoAsset({ photoUrl: "https://nicht-aufloesbar.invalid/foto.jpg", fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "http_error" });
});
