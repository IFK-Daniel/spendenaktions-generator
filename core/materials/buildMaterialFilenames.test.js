import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialFilenames } from "./buildMaterialFilenames.js";

const VALID_IFK_ID = "IFK7QX";

test("liefert die korrekten Dateinamen für alle fünf Materialtypen", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  const filenames = Object.fromEntries(result.map((entry) => [entry.key, entry.filename]));

  assert.equal(filenames.FLYER_DRUCKEREI, "IFK_Max_Mustermann_Flyer_Druckerei.pdf");
  assert.equal(filenames.FLYER_HOME, "IFK_Max_Mustermann_Flyer_Home.pdf");
  assert.equal(filenames.QR_PAYPAL_BLACK, "IFK_Max_Mustermann_PayPal_QR_schwarz.png");
  assert.equal(filenames.QR_GIRO_BLACK, "IFK_Max_Mustermann_GiroCode_schwarz.png");
  assert.equal(filenames.CERTIFICATE_REPRESENTATIVE, "Urkunde_Max_Mustermann.pdf");

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

test("ohne 'materials' werden alle fünf Dateinamen erzeugt", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });
  assert.equal(result.length, 5);
});

test("Urkunde: 'Daniel Feigenbutz' erzeugt 'Urkunde_Daniel_Feigenbutz.pdf'", () => {
  const result = buildMaterialFilenames({
    firstName: "Daniel",
    lastName: "Feigenbutz",
    ifkId: VALID_IFK_ID,
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_Daniel_Feigenbutz.pdf");
});

test("Urkunde: Umlaute/ß werden transliteriert (ä→ae, ö→oe, ü→ue, ß→ss)", () => {
  const result = buildMaterialFilenames({
    firstName: "Jürgen",
    lastName: "Weiß",
    ifkId: VALID_IFK_ID,
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_Juergen_Weiss.pdf");
});

test("Urkunde: Bindestrich-Nachname bleibt erhalten, Umlaute darin werden transliteriert", () => {
  const result = buildMaterialFilenames({
    firstName: "Maximilian",
    lastName: "Bartholomäus-Schweighofer",
    ifkId: VALID_IFK_ID,
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_Maximilian_Bartholomaeus-Schweighofer.pdf");
});

test("Urkunde: problematische Dateisystemzeichen erzeugen keinen ungültigen Dateinamen (nie 'Unknown.pdf')", () => {
  const result = buildMaterialFilenames({
    firstName: 'Max/Mo:ritz*Te?st"<>|',
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_MaxMoritzTest_Mustermann.pdf");
  assert.notEqual(result[0].filename, "Unknown.pdf");
});

test("Urkunde allein: fehlende IFK-ID wirft KEINEN Fehler (nicht fachlich benötigt)", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_Max_Mustermann.pdf");
  assert.equal(result[0].ifkId, undefined);
});

test("Urkunde allein: ungültige IFK-ID wirft KEINEN Fehler (nicht fachlich benötigt)", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: "IFK-7QX",
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });
  assert.equal(result[0].filename, "Urkunde_Max_Mustermann.pdf");
});

test("PayPal QR schwarz allein: fehlende IFK-ID wirft KEINEN Fehler (nicht Bestandteil des QR-Inhalts)", () => {
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    materials: ["QR_PAYPAL_BLACK"],
  });
  assert.equal(result[0].filename, "IFK_Max_Mustermann_PayPal_QR_schwarz.png");
  assert.equal(result[0].ifkId, undefined);
});

test("GiroCode schwarz allein: fehlende IFK-ID wirft weiterhin einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        firstName: "Max",
        lastName: "Mustermann",
        materials: ["QR_GIRO_BLACK"],
      }),
    /ungültige IFK-ID/
  );
});

test("Urkunde + GiroCode: fehlende IFK-ID wirft einen Fehler (von GiroCode benötigt)", () => {
  assert.throws(
    () =>
      buildMaterialFilenames({
        firstName: "Max",
        lastName: "Mustermann",
        materials: ["CERTIFICATE_REPRESENTATIVE", "QR_GIRO_BLACK"],
      }),
    /ungültige IFK-ID/
  );
});

test("'materials' akzeptiert auch das Ergebnis von buildMaterialList", async () => {
  const { buildMaterialList } = await import("./buildMaterialList.js");
  const materials = buildMaterialList({ include: ["QR_GIRO_BLACK"] });
  const result = buildMaterialFilenames({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].filename, "IFK_Max_Mustermann_GiroCode_schwarz.png");
});
