import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createZip } from "./createZip.js";

async function readZipEntries(blob) {
  const buffer = await blob.arrayBuffer();
  return JSZip.loadAsync(buffer);
}

test("ZIP mit einer Datei enthält genau diese Datei mit korrektem Inhalt", async () => {
  const result = await createZip({
    filename: "einzeldatei",
    files: [{ filename: "readme.txt", content: "Hallo IFK" }],
  });

  assert.equal(result.filename, "einzeldatei");
  assert.ok(result.blob instanceof Blob);
  assert.ok(result.size > 0);

  const zip = await readZipEntries(result.blob);
  const entryNames = Object.keys(zip.files);
  assert.deepEqual(entryNames, ["readme.txt"]);
  const text = await zip.file("readme.txt").async("string");
  assert.equal(text, "Hallo IFK");
});

test("ZIP mit mehreren Dateien enthält alle Dateien mit unveränderten Namen", async () => {
  const result = await createZip({
    filename: "mehrere-dateien",
    files: [
      { filename: "a.txt", content: "Inhalt A" },
      { filename: "b.txt", content: "Inhalt B" },
      { filename: "c.txt", content: "Inhalt C" },
    ],
  });

  const zip = await readZipEntries(result.blob);
  const entryNames = Object.keys(zip.files).sort();
  assert.deepEqual(entryNames, ["a.txt", "b.txt", "c.txt"]);

  assert.equal(await zip.file("a.txt").async("string"), "Inhalt A");
  assert.equal(await zip.file("b.txt").async("string"), "Inhalt B");
  assert.equal(await zip.file("c.txt").async("string"), "Inhalt C");
});

test("Unterordner werden anhand des Pfads im Dateinamen abgebildet", async () => {
  const result = await createZip({
    filename: "mit-unterordner",
    files: [
      { filename: "Logos/logo.svg", content: "<svg></svg>" },
      { filename: "readme.txt", content: "Hallo" },
    ],
  });

  const zip = await readZipEntries(result.blob);
  assert.ok(zip.file("Logos/logo.svg"), "Datei im Unterordner muss existieren");
  const svgContent = await zip.file("Logos/logo.svg").async("string");
  assert.equal(svgContent, "<svg></svg>");
});

test("Data-URL-Inhalte (Base64) werden korrekt als Binärdaten gespeichert", async () => {
  // "PNG-TEST" als Base64: UE5HLVRFU1Q=
  const dataUrl = "data:image/png;base64,UE5HLVRFU1Q=";
  const result = await createZip({
    filename: "mit-dataurl",
    files: [{ filename: "bild.png", content: dataUrl }],
  });

  const zip = await readZipEntries(result.blob);
  const bytes = await zip.file("bild.png").async("uint8array");
  const decoded = new TextDecoder().decode(bytes);
  assert.equal(decoded, "PNG-TEST");
});

test("Uint8Array- und ArrayBuffer-Inhalte werden unterstützt", async () => {
  const bytes = new TextEncoder().encode("Binärinhalt");
  const result = await createZip({
    filename: "mit-binaerdaten",
    files: [
      { filename: "uint8.bin", content: bytes },
      { filename: "arraybuffer.bin", content: bytes.buffer },
    ],
  });

  const zip = await readZipEntries(result.blob);
  assert.equal(
    new TextDecoder().decode(await zip.file("uint8.bin").async("uint8array")),
    "Binärinhalt"
  );
  assert.equal(
    new TextDecoder().decode(await zip.file("arraybuffer.bin").async("uint8array")),
    "Binärinhalt"
  );
});

test("leere Dateiliste wirft einen Fehler", async () => {
  await assert.rejects(
    () => createZip({ filename: "leer", files: [] }),
    /files/
  );
});

test("fehlende Dateiliste wirft einen Fehler", async () => {
  await assert.rejects(() => createZip({ filename: "ohne-files" }), /files/);
});

test("fehlender Dateiname eines Eintrags wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      createZip({
        filename: "fehlender-dateiname",
        files: [{ content: "Inhalt ohne Namen" }],
      }),
    /Dateinamen/
  );
});

test("leerer Dateiname eines Eintrags wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      createZip({
        filename: "leerer-dateiname",
        files: [{ filename: "   ", content: "Inhalt" }],
      }),
    /Dateinamen/
  );
});

test("fehlender Inhalt eines Eintrags wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      createZip({
        filename: "fehlender-inhalt",
        files: [{ filename: "leer.txt" }],
      }),
    /Inhalt/
  );
});

test("ungültiger Inhaltstyp eines Eintrags wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      createZip({
        filename: "ungueltiger-typ",
        files: [{ filename: "zahl.txt", content: 12345 }],
      }),
    /Datentyp/
  );
});

test("fehlender oder leerer Archivname wirft einen Fehler", async () => {
  await assert.rejects(
    () => createZip({ files: [{ filename: "a.txt", content: "A" }] }),
    /filename/
  );
  await assert.rejects(
    () => createZip({ filename: "  ", files: [{ filename: "a.txt", content: "A" }] }),
    /filename/
  );
});

test("das erzeugte Archiv ist größer als 0 Byte", async () => {
  const result = await createZip({
    filename: "groessencheck",
    files: [{ filename: "a.txt", content: "x" }],
  });
  assert.ok(result.size > 0);
  assert.equal(result.blob.size, result.size);
});
