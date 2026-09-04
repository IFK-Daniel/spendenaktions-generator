import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIELD_KEYS,
  getRequiredFieldsForMaterial,
  getRequiredFieldsForMaterials,
  getMissingFields,
} from "./materialRequirements.js";
import { MATERIAL_TYPE_KEYS, MATERIAL_TYPES } from "./materialTypes.js";
import { ROLE_KEYS, ROLE_KEY_LIST } from "./roleConfig.js";

test("Urkunde benötigt ausschließlich Vorname, Nachname, Geschlecht", () => {
  assert.deepEqual(getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE), [
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
  ]);
});

test("Urkunde benötigt auch für 'representative' keine Region", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, "representative");
  assert.equal(fields.includes(FIELD_KEYS.REGION), false);
  assert.equal(fields.includes(FIELD_KEYS.FEDERAL_STATE), false);
});

test("Botschafterurkunde benötigt Vorname, Nachname, Geschlecht (geschlechtsspezifischer Vorlagentext)", () => {
  assert.deepEqual(getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR), [
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
  ]);
});

test("Gremien-Urkunden (Beirat/Kuratorium/Fachrat/Wirtschaftsrat) benötigen NUR Vorname und Nachname — kein Geschlecht", () => {
  for (const key of [
    MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD,
    MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM,
    MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL,
    MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL,
  ]) {
    assert.deepEqual(
      getRequiredFieldsForMaterial(key),
      [FIELD_KEYS.FIRST_NAME, FIELD_KEYS.LAST_NAME],
      `${key} sollte nur Vorname/Nachname verlangen`
    );
  }
});

test("Gremien-Urkunden verlangen auch mit Rolle keine Region und kein Geschlecht", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM, "curator");
  for (const forbidden of [FIELD_KEYS.GENDER, FIELD_KEYS.REGION, FIELD_KEYS.FEDERAL_STATE, FIELD_KEYS.PHOTO_URL, FIELD_KEYS.IFK_ID]) {
    assert.equal(fields.includes(forbidden), false, `${forbidden} sollte nicht verlangt werden`);
  }
});

test("GiroCode benötigt ausschließlich Vorname, Nachname, IFK-ID", () => {
  assert.deepEqual(getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.QR_GIRO_BLACK), [
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.IFK_ID,
  ]);
});

test("GiroCode benötigt keinen PayPal-Link, kein Foto, keine Region, keine Telefonnummer, keine E-Mail", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.QR_GIRO_BLACK);
  for (const forbidden of [
    FIELD_KEYS.PAYPAL_URL,
    FIELD_KEYS.PHOTO_URL,
    FIELD_KEYS.REGION,
    FIELD_KEYS.PHONE,
    FIELD_KEYS.EMAIL,
  ]) {
    assert.equal(fields.includes(forbidden), false);
  }
});

test("PayPal-QR benötigt ausschließlich Vorname, Nachname, PayPal-Link", () => {
  assert.deepEqual(getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK), [
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.PAYPAL_URL,
  ]);
});

test("PayPal-QR benötigt keine IFK-ID, kein Foto, keine Region, keine Telefonnummer, keine E-Mail, kein Geschlecht", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK);
  for (const forbidden of [
    FIELD_KEYS.IFK_ID,
    FIELD_KEYS.PHOTO_URL,
    FIELD_KEYS.REGION,
    FIELD_KEYS.PHONE,
    FIELD_KEYS.EMAIL,
    FIELD_KEYS.GENDER,
  ]) {
    assert.equal(fields.includes(forbidden), false);
  }
});

test("Flyer benötigt für 'representative' auch Bundesland und Region", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_HOME, "representative");
  assert.equal(fields.includes(FIELD_KEYS.FEDERAL_STATE), true);
  assert.equal(fields.includes(FIELD_KEYS.REGION), true);
});

test("Flyer benötigt für 'ambassador' KEIN Bundesland und KEINE Region", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_HOME, "ambassador");
  assert.equal(fields.includes(FIELD_KEYS.FEDERAL_STATE), false);
  assert.equal(fields.includes(FIELD_KEYS.REGION), false);
});

test("KEIN Material verlangt für einen Nicht-Repräsentanten jemals Region/Bundesland — auch die (künftigen) Flyer nicht", () => {
  for (const roleKey of ROLE_KEY_LIST) {
    if (roleKey === ROLE_KEYS.REPRESENTATIVE) continue;
    for (const type of MATERIAL_TYPES) {
      const fields = getRequiredFieldsForMaterial(type.key, roleKey);
      assert.equal(
        fields.includes(FIELD_KEYS.REGION),
        false,
        `${type.key} / ${roleKey} darf keine Region verlangen`
      );
      assert.equal(
        fields.includes(FIELD_KEYS.FEDERAL_STATE),
        false,
        `${type.key} / ${roleKey} darf kein Bundesland verlangen`
      );
    }
  }
});

test("nur der Repräsentanten-Flyer ergänzt Region/Bundesland (Gegenprobe)", () => {
  for (const flyerKey of [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.FLYER_HOME]) {
    const repFields = getRequiredFieldsForMaterial(flyerKey, ROLE_KEYS.REPRESENTATIVE);
    assert.equal(repFields.includes(FIELD_KEYS.REGION), true);
    assert.equal(repFields.includes(FIELD_KEYS.FEDERAL_STATE), true);
  }
});

test("Flyer benötigt weiterhin die gemeinsamen Grunddaten inklusive IFK-ID und PayPal-Link", () => {
  const fields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, "ambassador");
  for (const expected of [
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
    FIELD_KEYS.EMAIL,
    FIELD_KEYS.PHONE,
    FIELD_KEYS.IFK_ID,
    FIELD_KEYS.PHOTO_URL,
    FIELD_KEYS.PAYPAL_URL,
  ]) {
    assert.equal(fields.includes(expected), true);
  }
});

test("Ansprache (Du/Sie) ist Pflicht für beide Flyer-Varianten", () => {
  for (const flyerKey of [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.FLYER_HOME]) {
    for (const roleKey of ["representative", "ambassador"]) {
      assert.equal(
        getRequiredFieldsForMaterial(flyerKey, roleKey).includes(FIELD_KEYS.SALUTATION),
        true,
        `${flyerKey} / ${roleKey} sollte Ansprache verlangen`
      );
    }
  }
});

test("Ansprache wird von KEINER Urkunde und KEINEM QR-Code verlangt", () => {
  for (const key of [
    MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE,
    MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR,
    MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD,
    MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM,
    MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL,
    MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL,
    MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK,
    MATERIAL_TYPE_KEYS.QR_GIRO_BLACK,
  ]) {
    for (const roleKey of ROLE_KEY_LIST) {
      assert.equal(
        getRequiredFieldsForMaterial(key, roleKey).includes(FIELD_KEYS.SALUTATION),
        false,
        `${key} / ${roleKey} darf keine Ansprache verlangen`
      );
    }
  }
});

test("Vereinigungsmenge Flyer + Urkunde: Ansprache stammt nur vom Flyer, blockiert die Urkunde aber nicht separat", () => {
  const flyerFields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_HOME, "representative");
  const certFields = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, "representative");
  assert.equal(flyerFields.includes(FIELD_KEYS.SALUTATION), true);
  assert.equal(certFields.includes(FIELD_KEYS.SALUTATION), false);

  // Datensatz ohne Ansprache: Urkunde ist "bereit", Flyer nicht.
  const values = { firstName: "Max", lastName: "Mustermann", gender: "male" };
  assert.deepEqual(getMissingFields(certFields, values), []);
  assert.ok(getMissingFields(flyerFields, values).includes(FIELD_KEYS.SALUTATION));
});

test("Ansprache erscheint in FIELD_ORDER direkt nach Geschlecht", () => {
  const flyer = getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_HOME, "representative");
  assert.equal(flyer.indexOf(FIELD_KEYS.SALUTATION), flyer.indexOf(FIELD_KEYS.GENDER) + 1);
});

test("unbekannter Materialtyp wirft einen Fehler", () => {
  assert.throws(() => getRequiredFieldsForMaterial("NICHT_VORHANDEN"), /unbekannter Materialtyp/);
});

test("Vereinigungsmenge Urkunde + GiroCode enthält Vorname, Nachname, Geschlecht, IFK-ID", () => {
  const fields = getRequiredFieldsForMaterials(
    [MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK],
    "representative"
  );
  assert.deepEqual(fields, [FIELD_KEYS.FIRST_NAME, FIELD_KEYS.LAST_NAME, FIELD_KEYS.GENDER, FIELD_KEYS.IFK_ID]);
});

test("Vereinigungsmenge Urkunde + PayPal-QR enthält Vorname, Nachname, Geschlecht, PayPal-Link", () => {
  const fields = getRequiredFieldsForMaterials(
    [MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK],
    "representative"
  );
  assert.deepEqual(fields, [FIELD_KEYS.FIRST_NAME, FIELD_KEYS.LAST_NAME, FIELD_KEYS.GENDER, FIELD_KEYS.PAYPAL_URL]);
});

test("Vereinigungsmenge Flyer + Urkunde + GiroCode fügt keine unnötigen Doppelanforderungen hinzu", () => {
  const flyerOnly = getRequiredFieldsForMaterials([MATERIAL_TYPE_KEYS.FLYER_HOME], "representative");
  const combined = getRequiredFieldsForMaterials(
    [MATERIAL_TYPE_KEYS.FLYER_HOME, MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK],
    "representative"
  );
  assert.deepEqual(combined, flyerOnly);
});

test("getMissingFields liefert nur tatsächlich fehlende Felder, in Reihenfolge der Anforderung", () => {
  const required = [FIELD_KEYS.FIRST_NAME, FIELD_KEYS.LAST_NAME, FIELD_KEYS.GENDER];
  const missing = getMissingFields(required, { firstName: "Max", lastName: "", gender: "" });
  assert.deepEqual(missing, [FIELD_KEYS.LAST_NAME, FIELD_KEYS.GENDER]);
});

test("getMissingFields: nur aus Leerzeichen bestehende Werte gelten als fehlend", () => {
  const missing = getMissingFields([FIELD_KEYS.FIRST_NAME], { firstName: "   " });
  assert.deepEqual(missing, [FIELD_KEYS.FIRST_NAME]);
});

test("getMissingFields: vollständig ausgefüllte Felder liefern ein leeres Ergebnis", () => {
  const missing = getMissingFields([FIELD_KEYS.FIRST_NAME, FIELD_KEYS.LAST_NAME], {
    firstName: "Max",
    lastName: "Mustermann",
  });
  assert.deepEqual(missing, []);
});
