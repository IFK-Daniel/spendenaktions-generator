import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRawFieldsFromOcrLines } from "./extractRawFieldsFromOcrLines.js";

function lines(...texts) {
  return texts.map((text) => ({ text, confidence: 92 }));
}

test("feste Label-Wert-Zuordnung: Label und Wert auf getrennten Zeilen", () => {
  const rawFields = extractRawFieldsFromOcrLines(
    lines(
      "Vorname",
      "Daniel",
      "Nachname",
      "Feigenbutz",
      "Geschlecht",
      "männlich",
      "Telefon mobil",
      "0152 33795099",
      "Bundesland",
      "NRW",
      "Region",
      "Düsseldorf",
      "IFK-Mailadresse",
      "d.feigenbutz@its-for-kids.de",
      "Mail-Adresse",
      "daniel@beispiel.de",
      "IFK-ID",
      "IFK7QX",
      "Paypal-URL",
      "https://www.paypal.com/donate/?hosted_button_id=ABC123"
    )
  );

  assert.equal(rawFields.firstName.text, "Daniel");
  assert.equal(rawFields.lastName.text, "Feigenbutz");
  assert.equal(rawFields.gender.text, "männlich");
  assert.equal(rawFields.phone.text, "0152 33795099");
  assert.equal(rawFields.federalState.text, "NRW");
  assert.equal(rawFields.region.text, "Düsseldorf");
  assert.equal(rawFields.ifkEmail.text, "d.feigenbutz@its-for-kids.de");
  assert.equal(rawFields.regularEmail.text, "daniel@beispiel.de");
  assert.equal(rawFields.ifkId.text, "IFK7QX");
  assert.equal(rawFields.paypalUrl.text, "https://www.paypal.com/donate/?hosted_button_id=ABC123");
});

test("Label und Wert auf derselben Zeile (mit Doppelpunkt)", () => {
  const rawFields = extractRawFieldsFromOcrLines(lines("Vorname: Daniel", "Nachname:Feigenbutz"));
  assert.equal(rawFields.firstName.text, "Daniel");
  assert.equal(rawFields.lastName.text, "Feigenbutz");
});

test("abweichende Leerzeichen und Zeilenumbrüche werden toleriert", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    { text: "   Vorname   ", confidence: 90 },
    { text: "", confidence: 0 },
    { text: "  Daniel  ", confidence: 90 },
    { text: "   ", confidence: 0 },
    { text: "  IFK-ID  ", confidence: 88 },
    { text: "ifk7qx", confidence: 88 },
  ]);
  assert.equal(rawFields.firstName.text, "Daniel");
  assert.equal(rawFields.ifkId.text, "ifk7qx");
});

test("fehlendes Label liefert null für dieses Feld", () => {
  const rawFields = extractRawFieldsFromOcrLines(lines("Vorname", "Daniel"));
  assert.equal(rawFields.lastName, null);
});

test("Label direkt gefolgt von einer weiteren Beschriftung gilt als leer", () => {
  const rawFields = extractRawFieldsFromOcrLines(lines("IFK-ID", "Mail-Adresse", "daniel@beispiel.de"));
  assert.equal(rawFields.ifkId, null);
  assert.equal(rawFields.regularEmail.text, "daniel@beispiel.de");
});

test("Konfidenzwerte werden pro Zeile mitgeführt", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    { text: "Vorname", confidence: 95 },
    { text: "Daniel", confidence: 41 },
  ]);
  assert.equal(rawFields.firstName.confidence, 41);
});

// Die folgenden Tests bilden ein reales Beobachtungsmuster nach: die
// humbee-Ansicht zeigt rechts neben jedem Wert eigene Bedienelemente
// (Icons/Buttons), die OCR gelegentlich als zusätzliches, meist sogar
// hochkonfidentes "Wort" auf derselben Zeile erkennt (Positionsdaten
// stammen aus einem echten humbee-Screenshot-Testlauf).
function word(text, x0, x1, confidence = 95) {
  return { text, x0, x1, confidence };
}

test("Bedienelement-Rauschen mit großem Abstand wird anhand der Wortposition verworfen", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "Nachname Feigenbutz een",
      confidence: 65,
      words: [word("Nachname", 83, 172), word("Feigenbutz", 299, 385), word("een", 826, 869, 7)],
    },
  ]);
  assert.equal(rawFields.lastName.text, "Feigenbutz");
});

test("Randrauschen wird auch bei einem langen Wert (E-Mail-Adresse) verworfen", () => {
  // Bei sehr langen Werten liegt das Randelement relativ nah am
  // Wertende — der reine Wortabstand reicht hier nicht aus, das
  // Randzonen-Signal (Position nahe der Dokumentbreite) greift.
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "Mail-Adresse d.feigenbutz@its-for-kids.de El €",
      confidence: 68,
      words: [
        word("Mail-Adresse", 83, 192),
        word("d.feigenbutz@its-for-kids.de", 298, 518, 90),
        word("El", 793, 828, 0),
        word("€", 837, 869, 91),
      ],
    },
  ]);
  assert.equal(rawFields.regularEmail.text, "d.feigenbutz@its-for-kids.de");
});

test("mehrwortige Beschriftung mit Rauschen: nur die Wertwörter im normalen Wortabstand bleiben erhalten", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "Telefon mobil +4915233795099 Filter",
      confidence: 92,
      words: [
        word("Telefon", 82, 142),
        word("mobil", 149, 193),
        word("+4915233795099", 294, 435),
        word("Filter", 830, 867, 85),
      ],
    },
  ]);
  assert.equal(rawFields.phone.text, "+4915233795099");
});

test("Rauschwort mit hoher Konfidenz wird trotzdem anhand der Position verworfen", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "Bundesland NRW €",
      confidence: 95,
      words: [word("Bundesland", 83, 181), word("NRW", 299, 338), word("€", 844, 868, 95)],
    },
  ]);
  assert.equal(rawFields.federalState.text, "NRW");
});

test("mehrere eng aufeinanderfolgende Wertwörter bleiben vollständig erhalten", () => {
  // Eine zweite, breitere Zeile mit einem Randelement legt die
  // tatsächliche Dokumentbreite fest (wie bei einem echten
  // mehrzeiligen Screenshot) — vermeidet, dass der Randbereich anhand
  // des zu prüfenden Werts selbst berechnet wird.
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "Region Rhein Main Gebiet",
      confidence: 92,
      words: [word("Region", 83, 150), word("Rhein", 200, 250), word("Main", 255, 300), word("Gebiet", 305, 360)],
    },
    {
      text: "Bundesland NRW €",
      confidence: 95,
      words: [word("Bundesland", 83, 181), word("NRW", 299, 338), word("€", 844, 868, 95)],
    },
  ]);
  assert.equal(rawFields.region.text, "Rhein Main Gebiet");
  assert.equal(rawFields.federalState.text, "NRW");
});

test("führendes Störzeichen vor einer Beschriftung wird toleriert", () => {
  const rawFields = extractRawFieldsFromOcrLines(lines(", IFK-ID", "Mail-Adresse", "daniel@beispiel.de"));
  assert.equal(rawFields.ifkId, null);
  assert.equal(rawFields.regularEmail.text, "daniel@beispiel.de");
});

test("PayPal-URL wird auch bei fehlgelesener Beschriftung anhand des Linkmusters gefunden", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "F https://www.paypal.com/donate/?hosted_button_id=BNQC",
      confidence: 63,
      words: [word("F", 139, 145, 36), word("https://www.paypal.com/donate/?hosted_button_id=BNQC", 299, 765, 90)],
    },
  ]);
  assert.equal(rawFields.paypalUrl.text, "https://www.paypal.com/donate/?hosted_button_id=BNQC");
});

test("umgebrochene PayPal-URL wird anhand der Wertespalte mit der Folgezeile zusammengeführt", () => {
  const rawFields = extractRawFieldsFromOcrLines([
    {
      text: "F https://www.paypal.com/donate/?hosted_button_id=BNQC",
      confidence: 63,
      words: [word("F", 139, 145, 36), word("https://www.paypal.com/donate/?hosted_button_id=BNQC", 299, 765, 90)],
    },
    {
      text: "BEE RNKW8HMJW",
      confidence: 25,
      words: [word("BEE", 83, 182, 36), word("RNKW8HMJW", 299, 414, 14)],
    },
  ]);
  assert.equal(
    rawFields.paypalUrl.text,
    "https://www.paypal.com/donate/?hosted_button_id=BNQCRNKW8HMJW"
  );
});
