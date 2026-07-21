import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialFilenames } from "./buildMaterialFilenames.js";

const VALID_IFK_ID = "IFK7QX";

test("liefert die korrekten Dateinamen für alle sechs Materialtypen", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  const filenames = Object.fromEntries(result.map((entry) => [entry.key, entry.filename]));

  assert.equal(filenames.FLYER_DRUCKEREI, "IFK_Max_Mustermann_Flyer_Druckerei.pdf");
  assert.equal(filenames.FLYER_HOME, "IFK_Max_Mustermann_Flyer_Home.pdf");
  assert.equal(filenames.QR_PAYPAL_GREEN, "IFK_Max_Mustermann_PayPal_QR_gruen.png");
  assert.equal(filenames.QR_PAYPAL_BLACK, "IFK_Max_Mustermann_PayPal_QR_schwarz.png");
  assert.equal(filenames.QR_GIRO_GREEN, "IFK_Max_Mustermann_GiroCode_gruen.png");
  assert.equal(filenames.QR_GIRO_BLACK, "IFK_Max_Mustermann_GiroCode_schwarz.png");

  for (const entry of result) {
    assert.equal(entry.ifkId, "IFK7QX");
  }
});

test("Namen mit Leerzeichen werden zu Unterstrichen bereinigt", () => {
  const result = buildMaterialFilenames({
    firstName: "  Anna Maria  ",
    lastName: "von Beispiel",
    ifkId: VALID_IFK_ID,
    materials: ["FLYER_HOME"],
  });
  assert.equal(result[0].filename, "IFK_Anna_Maria_von_Beispiel_Flyer_Home.pdf");
});

test("Namen mit Bindestrich bleiben erhalten", () => {
  const result = buildMaterialFilenames({
    firstName: "Anna-Lena",
    lastName: "Meyer-Schmidt",
    ifkId: VALID_IFK_ID,
    materials: ["FLYER_HOME"],
  });
  assert.equal(result[0].filename, "IFK_Anna-Lena_Meyer-Schmidt_Flyer_Home.pdf");
});

test("Umlaute im Namen bleiben erhalten", () => {
  const result = buildMaterialFilenames({
    firstName: "Jürgen",
    lastName: "Müller",
    ifkId: VALID_IFK_ID,
    materials: ["FLYER_HOME"],
  });
  assert.equal(result[0].filename, "IFK_Jürgen_Müller_Flyer_Home.pdf");
});

test("problematische Dateisystemzeichen werden entfernt", () => {
  const result = buildMaterialFilenames({
    firstName: 'Max/Mo:ritz*Te?st"<>|',
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["FLYER_HOME"],
  });
  assert.equal(result[0].filename, "IFK_MaxMoritzTest_Mustermann_Flyer_Home.pdf");
});

test("ungültige IFK-ID wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: "IFK-7QX",
      }),
    /ungültige IFK-ID/
  );
});

test("fehlender Vorname wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
      }),
    /firstName/
  );
});

test("fehlender Nachname wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        firstName: "Max",
        ifkId: VALID_IFK_ID,
      }),
    /lastName/
  );
});

test("unbekannter Materialtyp wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        materials: ["NICHT_VORHANDEN"],
      }),
    /unbekannter Materialtyp/
  );
});

test("ohne 'materials' werden alle sechs Dateinamen erzeugt", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });
  assert.equal(result.length, 6);
});

test("'materials' akzeptiert auch das Ergebnis von buildMaterialList", async () => {
  const { buildMaterialList } = await import("./buildMaterialList.js");
  const materials = buildMaterialList({ include: ["QR_GIRO_GREEN"] });
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].filename, "IFK_Max_Mustermann_GiroCode_gruen.png");
});
