import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeAttachmentBase64 } from "./encodeAttachmentBase64.js";

test("kodiert einen Uint8Array korrekt als Base64", async () => {
  const bytes = new TextEncoder().encode("Hallo IFK");
  const result = await encodeAttachmentBase64(bytes);
  assert.equal(Buffer.from(result, "base64").toString("utf-8"), "Hallo IFK");
});

test("kodiert ein ArrayBuffer korrekt als Base64", async () => {
  const bytes = new TextEncoder().encode("Hallo IFK");
  const result = await encodeAttachmentBase64(bytes.buffer);
  assert.equal(Buffer.from(result, "base64").toString("utf-8"), "Hallo IFK");
});

test("kodiert einen Blob korrekt als Base64", async () => {
  const blob = new Blob(["Hallo IFK"], { type: "text/plain" });
  const result = await encodeAttachmentBase64(blob);
  assert.equal(Buffer.from(result, "base64").toString("utf-8"), "Hallo IFK");
});

test("nicht unterstützter Inhaltstyp wirft einen Fehler", async () => {
  await assert.rejects(() => encodeAttachmentBase64(12345), /nicht unterstützter Inhaltstyp/);
});
