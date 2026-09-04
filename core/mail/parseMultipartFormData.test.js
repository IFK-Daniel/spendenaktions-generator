import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { parseMultipartFormData } from "./parseMultipartFormData.js";

/**
 * Baut aus einem echten `FormData`-Objekt einen fake-`req` (lesbarer
 * Node-Stream + `headers`, wie `http.IncomingMessage`) — nutzt
 * denselben Serialisierungsweg (`Response`), den auch
 * `core/mail/sendRepresentativeMaterials.js` für die Größenmessung vor
 * dem echten Versand verwendet, damit der Test einen ECHTEN Multipart-
 * Body prüft statt eines handgebauten Strings.
 */
async function fakeMultipartRequest(formData) {
  const response = new Response(formData);
  const contentType = response.headers.get("content-type");
  const buffer = Buffer.from(await response.arrayBuffer());

  const req = new PassThrough();
  req.headers = { "content-type": contentType };
  req.end(buffer);
  return req;
}

test("parseMultipartFormData: liest ein Textfeld (metadata) korrekt", async () => {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify({ kind: "recipient", to: "max@example.com" }));
  formData.append("files", new Blob(["zip-inhalt"]), "IFK_Materialien.zip");

  const req = await fakeMultipartRequest(formData);
  const { fields } = await parseMultipartFormData(req);

  assert.equal(fields.metadata, JSON.stringify({ kind: "recipient", to: "max@example.com" }));
});

test("parseMultipartFormData: liest eine Datei binär mit erhaltenem Namen und MIME-Typ", async () => {
  const formData = new FormData();
  formData.append("metadata", "{}");
  formData.append("files", new Blob(["fake-pdf-bytes"], { type: "application/pdf" }), "Flyer_Druckerei.pdf");

  const req = await fakeMultipartRequest(formData);
  const { files } = await parseMultipartFormData(req);

  assert.equal(files.length, 1);
  assert.equal(files[0].filename, "Flyer_Druckerei.pdf");
  assert.equal(files[0].mimeType, "application/pdf");
  assert.ok(Buffer.isBuffer(files[0].content));
  assert.equal(files[0].content.toString("utf8"), "fake-pdf-bytes");
});

test("parseMultipartFormData: liest mehrere Dateien unter demselben Feldnamen vollständig und binär (kein Base64)", async () => {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify({ kind: "humbee" }));
  formData.append("files", new Blob(["eins"]), "a.png");
  formData.append("files", new Blob(["zwei"]), "b.png");
  formData.append("files", new Blob(["drei"]), "c.pdf");

  const req = await fakeMultipartRequest(formData);
  const { files } = await parseMultipartFormData(req);

  assert.equal(files.length, 3);
  assert.deepEqual(
    files.map((f) => f.filename),
    ["a.png", "b.png", "c.pdf"]
  );
  assert.deepEqual(
    files.map((f) => f.content.toString("utf8")),
    ["eins", "zwei", "drei"]
  );
});

test("parseMultipartFormData: Binärinhalt bleibt bytegenau erhalten (kein Text-/Encoding-Verlust)", async () => {
  const bytes = new Uint8Array([0, 1, 2, 253, 254, 255, 10, 13, 45, 45]); // enthält CR/LF und '--' (Boundary-typische Bytes)
  const formData = new FormData();
  formData.append("metadata", "{}");
  formData.append("files", new Blob([bytes]), "binary.dat");

  const req = await fakeMultipartRequest(formData);
  const { files } = await parseMultipartFormData(req);

  assert.deepEqual(new Uint8Array(files[0].content), bytes);
});

test("parseMultipartFormData: wirft bei fehlender/ungültiger Content-Type-Boundary", async () => {
  const req = new PassThrough();
  req.headers = { "content-type": "multipart/form-data" }; // keine boundary
  req.end("irgendwas");

  await assert.rejects(() => parseMultipartFormData(req));
});
