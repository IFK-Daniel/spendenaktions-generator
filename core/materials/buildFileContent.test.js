import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFileContent } from "./buildFileContent.js";

const BYTES = new Uint8Array([1, 2, 3, 4]);

test("erzeugt ein File-Objekt mit dem übergebenen Dateinamen (Node/Browser haben beide 'File')", () => {
  const { content, size } = buildFileContent(BYTES, "Urkunde_Daniel_Feigenbutz.pdf", "application/pdf");
  assert.ok(content instanceof Blob, "File erweitert Blob");
  assert.equal(content.name, "Urkunde_Daniel_Feigenbutz.pdf");
  assert.equal(content.type, "application/pdf");
  assert.equal(size, BYTES.length);
  assert.equal(content.size, BYTES.length);
});

test("Objekt trägt den Dateinamen auch bei Umlauten unverändert mit", () => {
  const { content } = buildFileContent(BYTES, "Urkunde_Jürgen_Müller.pdf", "application/pdf");
  assert.equal(content.name, "Urkunde_Jürgen_Müller.pdf");
});

test("gibt die korrekte Größe für leere Bytes zurück", () => {
  const { content, size } = buildFileContent(new Uint8Array([]), "leer.png", "image/png");
  assert.equal(size, 0);
  assert.equal(content.size, 0);
});
