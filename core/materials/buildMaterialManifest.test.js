import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialManifest } from "./buildMaterialManifest.js";

const VALID_IFK_ID = "IFK7QX";

test("liefert ein vollständiges Manifest mit Version, Person und allen Materialien", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.person, {
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: "IFK7QX",
  });
  assert.equal(manifest.materials.length, 6);
});

test("Personendaten sind korrekt, inklusive normalisierter IFK-ID", () => {
  const manifest = buildMaterialManifest({
    firstName: "  Anna  ",
    lastName: "  Beispiel  ",
    ifkId: "ifk7qx",
  });

  assert.deepEqual(manifest.person, {
    firstName: "Anna",
    lastName: "Beispiel",
    ifkId: "IFK7QX",
  });
});

test("Materialreihenfolge im Manifest entspricht der festen Reihenfolge", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  assert.deepEqual(
    manifest.materials.map((entry) => entry.key),
    [
      "FLYER_DRUCKEREI",
      "FLYER_HOME",
      "QR_PAYPAL_GREEN",
      "QR_PAYPAL_BLACK",
      "QR_GIRO_GREEN",
      "QR_GIRO_BLACK",
    ]
  );
});

test("jeder Material-Eintrag enthält key, label, category, format, extension, filename", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["QR_GIRO_GREEN"],
  });

  assert.deepEqual(manifest.materials[0], {
    key: "QR_GIRO_GREEN",
    label: "GiroCode grün",
    category: "qr",
    format: "png",
    extension: "png",
    filename: "IFK_Max_Mustermann_GiroCode_gruen.png",
  });
});

test("Auswahl einzelner Materialien wird korrekt übernommen", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["FLYER_DRUCKEREI", "QR_PAYPAL_BLACK"],
  });

  assert.deepEqual(
    manifest.materials.map((entry) => entry.key),
    ["FLYER_DRUCKEREI", "QR_PAYPAL_BLACK"]
  );
});

test("Manifest enthält keine Dateiinhalte, Blob-Daten, URLs oder Binärdaten", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  const serialized = JSON.stringify(manifest);
  assert.equal(/content|blob|data:|url|attachment/i.test(serialized), false);

  for (const entry of manifest.materials) {
    assert.deepEqual(Object.keys(entry).sort(), [
      "category",
      "extension",
      "filename",
      "format",
      "key",
      "label",
    ]);
  }
  assert.deepEqual(Object.keys(manifest).sort(), ["materials", "person", "version"]);
});

test("ungültige IFK-ID wirft einen Fehler (delegiert an buildMaterialFilenames)", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: "IFK-7QX",
      }),
    /ungültige IFK-ID/
  );
});

test("ohne Angabe von gender enthält person kein gender-Feld", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  assert.deepEqual(Object.keys(manifest.person).sort(), ["firstName", "ifkId", "lastName"]);
});

test("gender 'male' wird unverändert in person übernommen", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    gender: "male",
  });

  assert.equal(manifest.person.gender, "male");
});

test("gender 'female' wird unverändert in person übernommen", () => {
  const manifest = buildMaterialManifest({
    firstName: "Anna",
    lastName: "Beispiel",
    ifkId: VALID_IFK_ID,
    gender: "female",
  });

  assert.equal(manifest.person.gender, "female");
});

test("ungültiger gender-Wert wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        gender: "divers",
      }),
    /ungültiger Wert für 'gender'/
  );
});

test("email, phone, photoUrl, federalState und region werden getrimmt in person übernommen", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    email: "  max@example.com  ",
    phone: "  +49 170 1234567  ",
    photoUrl: "  https://example.com/foto.jpg  ",
    federalState: "  Bayern  ",
    region: "  München  ",
  });

  assert.equal(manifest.person.email, "max@example.com");
  assert.equal(manifest.person.phone, "+49 170 1234567");
  assert.equal(manifest.person.photoUrl, "https://example.com/foto.jpg");
  assert.equal(manifest.person.federalState, "Bayern");
  assert.equal(manifest.person.region, "München");
});

test("ohne Angabe von email/phone/photoUrl/federalState/region enthält person diese Felder nicht", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  assert.deepEqual(Object.keys(manifest.person).sort(), ["firstName", "ifkId", "lastName"]);
});

test("ungültige email wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        email: "keine-email",
      }),
    /ungültiger Wert für 'email'/
  );
});

test("leere oder nur aus Leerzeichen bestehende phone wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        phone: "   ",
      }),
    /'phone' darf nicht leer sein/
  );
});

test("photoUrl ohne http\\/https-Protokoll wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        photoUrl: "ftp://example.com/foto.jpg",
      }),
    /ungültiger Wert für 'photoUrl'/
  );
});

test("photoUrl als Freitext ohne URL-Struktur wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        photoUrl: "kein-link",
      }),
    /ungültiger Wert für 'photoUrl'/
  );
});

test("leeres federalState wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        federalState: "   ",
      }),
    /'federalState' darf nicht leer sein/
  );
});

test("leere region wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        region: "   ",
      }),
    /'region' darf nicht leer sein/
  );
});
