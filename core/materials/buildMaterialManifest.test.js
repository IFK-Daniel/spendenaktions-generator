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
  assert.equal(manifest.materials.length, 10);
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

  assert.deepEqual(manifest.materials.map((entry) => entry.key), [
    "FLYER_DRUCKEREI",
    "FLYER_HOME",
    "QR_PAYPAL_BLACK",
    "QR_GIRO_BLACK",
    "CERTIFICATE_REPRESENTATIVE",
    "CERTIFICATE_AMBASSADOR",
    "CERTIFICATE_ADVISORY_BOARD",
    "CERTIFICATE_CURATORIUM",
    "CERTIFICATE_EXPERT_COUNCIL",
    "CERTIFICATE_ECONOMIC_COUNCIL",
  ]);
});

test("jeder Material-Eintrag enthält key, label, category, format, extension, filename", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["QR_GIRO_BLACK"],
  });

  assert.deepEqual(manifest.materials[0], {
    key: "QR_GIRO_BLACK",
    label: "GiroCode schwarz",
    category: "qr",
    format: "png",
    extension: "png",
    filename: "IFK_Max_Mustermann_GiroCode_schwarz.png",
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

test("ohne Angabe von salutation enthält person kein salutation-Feld", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    gender: "male",
  });

  assert.equal("salutation" in manifest.person, false);
});

test("salutation 'du' / 'sie' wird unverändert in person übernommen", () => {
  for (const salutation of ["du", "sie"]) {
    const manifest = buildMaterialManifest({
      firstName: "Max",
      lastName: "Mustermann",
      ifkId: VALID_IFK_ID,
      gender: "male",
      salutation,
    });
    assert.equal(manifest.person.salutation, salutation);
  }
});

test("ungültiger salutation-Wert wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        gender: "male",
        salutation: "ihr",
      }),
    /ungültiger Wert für 'salutation'/
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

test("Urkunde allein: ohne IFK-ID enthält person kein ifkId-Feld und wirft keinen Fehler", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    materials: ["CERTIFICATE_REPRESENTATIVE"],
  });

  assert.deepEqual(Object.keys(manifest.person).sort(), ["firstName", "lastName"]);
});

test("PayPal QR schwarz allein: ohne IFK-ID enthält person kein ifkId-Feld und wirft keinen Fehler", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    materials: ["QR_PAYPAL_BLACK"],
  });

  assert.deepEqual(Object.keys(manifest.person).sort(), ["firstName", "lastName"]);
});

test("GiroCode schwarz allein: ohne IFK-ID wirft weiterhin einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        materials: ["QR_GIRO_BLACK"],
      }),
    /ungültige IFK-ID/
  );
});

test("GiroCode schwarz allein: mit gültiger IFK-ID enthält person das ifkId-Feld", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    materials: ["QR_GIRO_BLACK"],
  });

  assert.equal(manifest.person.ifkId, "IFK7QX");
});

test("ohne Angabe von role enthält person kein role-Feld", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
  });

  assert.equal("role" in manifest.person, false);
});

test("gültiger role-Wert wird unverändert in person übernommen", () => {
  const manifest = buildMaterialManifest({
    firstName: "Max",
    lastName: "Mustermann",
    ifkId: VALID_IFK_ID,
    role: "ambassador",
  });

  assert.equal(manifest.person.role, "ambassador");
});

test("ungültiger role-Wert wirft einen Fehler", () => {
  assert.throws(
    () =>
      buildMaterialManifest({
        firstName: "Max",
        lastName: "Mustermann",
        ifkId: VALID_IFK_ID,
        role: "nicht-vorhanden",
      }),
    /ungültiger Wert für 'role'/
  );
});
