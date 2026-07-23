import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExtractionFields } from "./buildExtractionFields.js";

function raw(text, confidence = 90) {
  return { text, confidence };
}

const FULL_RAW = {
  firstName: raw("Daniel"),
  lastName: raw("Feigenbutz"),
  gender: raw("männlich"),
  phone: raw("+49 152 33795099"),
  federalState: raw("NRW"),
  region: raw("Düsseldorf"),
  ifkEmail: raw("d.feigenbutz@its-for-kids.de"),
  regularEmail: raw("daniel@beispiel.de"),
  ifkId: raw("IFK7QX"),
  paypalUrl: raw("https://www.paypal.com/donate/?hosted_button_id=ABC123"),
};

test("vollständiger Screenshot: alle Felder werden korrekt erkannt", () => {
  const fields = buildExtractionFields(FULL_RAW);

  assert.deepEqual(fields.firstName, { value: "Daniel", status: "recognized" });
  assert.deepEqual(fields.lastName, { value: "Feigenbutz", status: "recognized" });
  assert.deepEqual(fields.gender, { value: "male", status: "recognized" });
  assert.deepEqual(fields.phone, { value: "0152 33795099", status: "recognized" });
  assert.deepEqual(fields.federalState, { value: "NRW", status: "recognized" });
  assert.deepEqual(fields.region, { value: "Düsseldorf", status: "recognized" });
  assert.deepEqual(fields.ifkEmail, { value: "d.feigenbutz@its-for-kids.de", status: "recognized" });
  assert.deepEqual(fields.regularEmail, { value: "daniel@beispiel.de", status: "recognized" });
  assert.deepEqual(fields.ifkId, { value: "IFK7QX", status: "recognized" });
  assert.deepEqual(fields.paypalUrl, {
    value: "https://www.paypal.com/donate/?hosted_button_id=ABC123",
    status: "recognized",
  });
  assert.deepEqual(fields.emailForForm, { value: "d.feigenbutz@its-for-kids.de", source: "ifkEmail" });
});

test("IFK-Mailadresse wird gegenüber normaler Mail-Adresse bevorzugt", () => {
  const fields = buildExtractionFields(FULL_RAW);
  assert.equal(fields.emailForForm.source, "ifkEmail");
});

test("Fallback auf normale Mail-Adresse, wenn IFK-Mailadresse fehlt", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, ifkEmail: null });
  assert.deepEqual(fields.emailForForm, { value: "daniel@beispiel.de", source: "regularEmail" });
});

test("beide Mailadressen fehlen: E-Mail-Feld bleibt leer", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, ifkEmail: null, regularEmail: null });
  assert.deepEqual(fields.emailForForm, { value: "", source: null });
});

test("IFK-ID vorhanden und gültig wird übernommen", () => {
  const fields = buildExtractionFields(FULL_RAW);
  assert.deepEqual(fields.ifkId, { value: "IFK7QX", status: "recognized" });
});

test("fehlende IFK-ID bleibt leer", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, ifkId: null });
  assert.deepEqual(fields.ifkId, { value: "", status: "not_recognized" });
});

test("ungültige IFK-ID wird nicht übernommen", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, ifkId: raw("ABC123") });
  assert.deepEqual(fields.ifkId, { value: "", status: "needs_review" });
});

test("eindeutig gefundene, aber leere IFK-ID gilt als bestätigt leer statt prüfbedürftig", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    ifkId: { text: "", confidence: 90, confirmedEmpty: true },
  });
  assert.deepEqual(fields.ifkId, { value: "", status: "confirmed_empty" });
});

test("Bedienelement-Rauschen als vermeintlicher IFK-ID-Wert gilt ebenfalls als bestätigt leer", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    ifkId: raw('Mail "Willkommen als Repräsentant"'),
  });
  assert.deepEqual(fields.ifkId, { value: "", status: "confirmed_empty" });
});

test("nicht gefundene IFK-ID-Zeile bleibt schlicht nicht erkannt (kein bestätigt leer)", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, ifkId: null });
  assert.deepEqual(fields.ifkId, { value: "", status: "not_recognized" });
});

test("Geschlecht männlich/weiblich wird korrekt normalisiert", () => {
  assert.equal(buildExtractionFields({ ...FULL_RAW, gender: raw("männlich") }).gender.value, "male");
  assert.equal(buildExtractionFields({ ...FULL_RAW, gender: raw("weiblich") }).gender.value, "female");
});

test("unbekanntes oder fehlendes Geschlecht wird nicht geraten", () => {
  assert.deepEqual(buildExtractionFields({ ...FULL_RAW, gender: raw("unbekannt") }).gender, {
    value: "",
    status: "needs_review",
  });
  assert.deepEqual(buildExtractionFields({ ...FULL_RAW, gender: null }).gender, {
    value: "",
    status: "not_recognized",
  });
});

test("vollständige PayPal-URL wird korrekt erkannt", () => {
  const fields = buildExtractionFields(FULL_RAW);
  assert.equal(fields.paypalUrl.status, "recognized");
});

test("abgeschnittene PayPal-URL wird als prüfbedürftig markiert", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, paypalUrl: raw("paypal.com/donate/?hosted") });
  assert.equal(fields.paypalUrl.status, "needs_review");
});

test("Feldbeschriftungen als OCR-Wert werden nie übernommen", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    firstName: raw("Vorname"),
    regularEmail: raw("Mail-Adresse"),
    ifkEmail: raw("IFK-Mailadresse"),
    paypalUrl: raw("Paypal-URL"),
    ifkId: raw("IFK-ID"),
  });
  assert.equal(fields.firstName.value, "");
  assert.equal(fields.regularEmail.value, "");
  assert.equal(fields.ifkEmail.value, "");
  assert.equal(fields.paypalUrl.value, "");
  assert.equal(fields.ifkId.value, "");
});

test("OCR-Verwechslungen mit niedriger Konfidenz werden nicht ungeprüft übernommen", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    firstName: raw("Danlel", 32),
    ifkEmail: raw("d.feigenbutz@its-for-kids.de", 25),
    ifkId: raw("IFK7QX", 20),
  });
  assert.equal(fields.firstName.status, "needs_review");
  assert.equal(fields.ifkEmail.status, "needs_review");
  assert.equal(fields.ifkId.status, "needs_review");
  // Bei needs_review durch niedrige Konfidenz bleibt der (ggf. korrekte)
  // Wert zur Prüfung sichtbar, wird aber nicht automatisch übernommen.
  assert.equal(fields.firstName.value, "Danlel");
  assert.equal(fields.ifkId.value, "IFK7QX");
});

test("hohe Konfidenz beeinflusst eine bereits erkannte Zuordnung nicht", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, firstName: raw("Daniel", 99) });
  assert.deepEqual(fields.firstName, { value: "Daniel", status: "recognized" });
});

test("fehlende Konfidenzangabe führt zu keiner Herabstufung", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, firstName: { text: "Daniel" } });
  assert.deepEqual(fields.firstName, { value: "Daniel", status: "recognized" });
});

// Zeichengenaue Konfidenzbewertung — reales Beobachtungsmuster: eine
// niedrige Wort-Konfidenz (Sprachmodell hält den Wert für kein
// plausibles Wort) bedeutet nicht, dass jedes einzelne Zeichen
// unsicher gelesen wurde.
function symbol(text, confidence) {
  return { text, confidence };
}

test("niedrige Wort-Konfidenz, aber alle Zeichen sicher: Wert bleibt recognized", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    paypalUrl: {
      text: "https://www.paypal.com/donate/?hosted_button_id=BNQCRNKW",
      confidence: 14,
      symbols: "https://www.paypal.com/donate/?hosted_button_id=BNQCRNKW"
        .split("")
        .map((c) => symbol(c, 98)),
    },
  });
  assert.equal(fields.paypalUrl.status, "recognized");
  assert.equal(fields.paypalUrl.chars, undefined);
});

test("nur das tatsächlich unsichere Zeichen macht den Wert prüfbedürftig, nicht der gesamte Wert", () => {
  const url = "https://www.paypal.com/donate/?hosted_button_id=BNQCRNKW8HMUW";
  const symbols = url.split("").map((c) => symbol(c, 98));
  // Position des "U" in "...HMUW" (das tatsächlich falsch gelesene Zeichen).
  const uIndex = url.lastIndexOf("U");
  symbols[uIndex] = symbol("U", 87);

  const fields = buildExtractionFields({
    ...FULL_RAW,
    paypalUrl: { text: url, confidence: 14, symbols },
  });

  assert.equal(fields.paypalUrl.status, "needs_review");
  assert.ok(Array.isArray(fields.paypalUrl.chars));
  assert.equal(fields.paypalUrl.chars.length, url.length);
  assert.equal(fields.paypalUrl.chars.filter((c) => c.uncertain).length, 1);
  assert.equal(fields.paypalUrl.chars[uIndex].char, "U");
  assert.equal(fields.paypalUrl.chars[uIndex].uncertain, true);
});

test("ohne zeichengenaue Symboldaten bleibt die bisherige grobe Konfidenzbewertung bestehen", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    paypalUrl: raw("https://www.paypal.com/donate/?hosted_button_id=BNQCRNKW8HMUW", 14),
  });
  assert.equal(fields.paypalUrl.status, "needs_review");
  assert.equal(fields.paypalUrl.chars, undefined);
});

// Telefonnummer-Normalisierung (+49/0049 → 0…) und Österreich-Ausnahme.

test("deutsche internationale Vorwahl +49 wird auf Inlandsschreibweise umgestellt", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, phone: raw("+49 1523 3795099") });
  assert.equal(fields.phone.value, "01523 3795099");
});

test("deutsche internationale Vorwahl 0049 wird auf Inlandsschreibweise umgestellt", () => {
  const fields = buildExtractionFields({ ...FULL_RAW, phone: raw("0049 2103 986670") });
  assert.equal(fields.phone.value, "02103 986670");
});

test("österreichisches Bundesland: Telefonnummer mit +49-ähnlichem Muster bleibt dennoch unverändert, wenn kein deutsches Muster vorliegt", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    federalState: raw("Wien"),
    phone: raw("+43 664 1234567"),
  });
  assert.equal(fields.phone.value, "+43 664 1234567");
});

test("erkanntes österreichisches Bundesland unterdrückt die deutsche Telefonnummer-Umschreibung", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    federalState: raw("Tirol"),
    phone: raw("+49 664 1234567"),
  });
  // Die Umschreibung wird bewusst unterdrückt, sobald ein
  // österreichisches Bundesland erkannt wurde — auch wenn die Nummer
  // selbst zufällig einem deutschen Muster entspricht.
  assert.equal(fields.phone.value, "+49 664 1234567");
});

test("deutsches Bundesland: +49-Vorwahl wird normal umgeschrieben", () => {
  const fields = buildExtractionFields({
    ...FULL_RAW,
    federalState: raw("Bayern"),
    phone: raw("+49 1523 3795099"),
  });
  assert.equal(fields.phone.value, "01523 3795099");
});
