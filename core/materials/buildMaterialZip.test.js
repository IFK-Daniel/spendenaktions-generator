import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { buildMaterialZip } from "./buildMaterialZip.js";

const VALID_IFK_ID = "IFK7QX";

async function readZipEntries(blob) {
  const buffer = await blob.arrayBuffer();
  return JSZip.loadAsync(buffer);
}

test("Dateiname des Archivs enthält IFK-ID, Vorname und Nachname", async () => {
  const result = await buildMaterialZip({
    ifkId: VALID_IFK_ID,
    firstName: "Max",
    lastName: "Mustermann",
    files: [{ filename: "IFK_Max_Mustermann_PayPal_QR_gruen.png", content: "Inhalt" }],
  });

  assert.equal(result.filename, "IFK_Materialien_IFK7QX_Max_Mustermann.zip");
});

test("Archiv enthält exakt die übergebenen Materialdateien", async () => {
  const files = [
    { filename: "IFK_Max_Mustermann_PayPal_QR_gruen.png", content: "grün" },
    { filename: "IFK_Max_Mustermann_PayPal_QR_schwarz.png", content: "schwarz" },
    { filename: "IFK_Max_Mustermann_GiroCode_gruen.png", content: "giro-grün" },
    { filename: "IFK_Max_Mustermann_GiroCode_schwarz.png", content: "giro-schwarz" },
  ];

  const result = await buildMaterialZip({
    ifkId: VALID_IFK_ID,
    firstName: "Max",
    lastName: "Mustermann",
    files,
  });

  const zip = await readZipEntries(result.blob);
  const entryNames = Object.keys(zip.files).sort();
  assert.deepEqual(
    entryNames,
    files.map((file) => file.filename).sort()
  );

  for (const file of files) {
    assert.equal(await zip.file(file.filename).async("string"), file.content);
  }
});

test("nur ausgewählte (tatsächlich erzeugte) Materialien landen im Archiv", async () => {
  const result = await buildMaterialZip({
    ifkId: VALID_IFK_ID,
    firstName: "Max",
    lastName: "Mustermann",
    files: [{ filename: "IFK_Max_Mustermann_GiroCode_gruen.png", content: "giro-grün" }],
  });

  const zip = await readZipEntries(result.blob);
  assert.deepEqual(Object.keys(zip.files), ["IFK_Max_Mustermann_GiroCode_gruen.png"]);
});

test("leere Dateiliste wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      buildMaterialZip({
        ifkId: VALID_IFK_ID,
        firstName: "Max",
        lastName: "Mustermann",
        files: [],
      }),
    /files/
  );
});

test("ungültige IFK-ID wirft einen Fehler", async () => {
  await assert.rejects(
    () =>
      buildMaterialZip({
        ifkId: "IFK-7QX",
        firstName: "Max",
        lastName: "Mustermann",
        files: [{ filename: "a.png", content: "x" }],
      }),
    /ungültige IFK-ID/
  );
});
