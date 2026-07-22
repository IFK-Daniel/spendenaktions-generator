import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialZipFilename } from "./buildMaterialZipFilename.js";

const VALID_IFK_ID = "IFK7QX";

test("enthält IFK-ID, Vorname und Nachname im erwarteten Schema", () => {
  const filename = buildMaterialZipFilename({
    ifkId: VALID_IFK_ID,
    firstName: "Max",
    lastName: "Mustermann",
  });

  assert.equal(filename, "IFK_Materialien_IFK7QX_Max_Mustermann.zip");
});

test("normalisiert eine kleingeschriebene IFK-ID", () => {
  const filename = buildMaterialZipFilename({
    ifkId: "ifk7qx",
    firstName: "Max",
    lastName: "Mustermann",
  });

  assert.equal(filename, "IFK_Materialien_IFK7QX_Max_Mustermann.zip");
});

test("bereinigt Vor- und Nachname wie buildMaterialFilenames", () => {
  const filename = buildMaterialZipFilename({
    ifkId: VALID_IFK_ID,
    firstName: "  Anna Maria  ",
    lastName: "von Beispiel",
  });

  assert.equal(filename, "IFK_Materialien_IFK7QX_Anna_Maria_von_Beispiel.zip");
});

test("ungültige IFK-ID wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialZipFilename({
        ifkId: "IFK-7QX",
        firstName: "Max",
        lastName: "Mustermann",
      }),
    /ungültige IFK-ID/
  );
});

test("fehlender Vorname wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialZipFilename({
        ifkId: VALID_IFK_ID,
        lastName: "Mustermann",
      }),
    /firstName/
  );
});
