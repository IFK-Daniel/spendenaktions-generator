import test from "node:test";
import assert from "node:assert/strict";
import { repairPaypalUrlLine } from "./repairPaypalUrlLine.js";
import { extractRawFieldsFromOcrLines } from "./extractRawFieldsFromOcrLines.js";

const w = (text, x0, x1, y0, y1 = y0 + 20) => ({ text, confidence: 90, x0, x1, y0, y1 });
const line = (words) => ({ text: words.map((x) => x.text).join(" "), confidence: 90, words });

function baseLines() {
  return [
    line([w("Mail-Adresse", 45, 153, 327), w("sifu@wingtsjun.com", 259, 414, 337)]),
    line([w("Paypal-URL", 45, 143, 453), w("EEE", 259, 675, 443)]),
    line([w("IFK-ID", 45, 96, 495), w("IFKSDW", 260, 325, 495)]),
  ];
}

const URL_TEXT = "https://www.paypal.com/donate/?hosted_button_id=\nQ2KB9RP3MBCR6\n";

test("Störzeichen statt Link → zweiter Durchlauf setzt den vollständigen Link an die Beschriftung", async () => {
  let rect;
  const repaired = await repairPaypalUrlLine(baseLines(), async (r) => {
    rect = r;
    return { text: URL_TEXT, confidence: 88 };
  });
  const raw = extractRawFieldsFromOcrLines(repaired);
  assert.equal(raw.paypalUrl.text, "https://www.paypal.com/donate/?hosted_button_id=Q2KB9RP3MBCR6");
  assert.equal(raw.ifkId.text, "IFKSDW");
  // Region liegt rechts der Beschriftung und endet vor der IFK-ID-Zeile.
  assert.ok(rect.left > 143 && rect.top < 453 && rect.top + rect.height <= 495);
});

test("Link bereits erkannt → keine Nachbesserung, recognizeRegion wird nicht aufgerufen", async () => {
  const lines = [line([w("Paypal-URL", 45, 143, 453), w("https://www.paypal.com/donate/?hosted_button_id=", 259, 675, 443)])];
  let called = false;
  const result = await repairPaypalUrlLine(lines, async () => {
    called = true;
    return { text: "x" };
  });
  assert.equal(called, false);
  assert.equal(result, lines);
});

test("zweiter Durchlauf ohne PayPal-Link oder mit Fehler → Zeilen unverändert", async () => {
  const lines = baseLines();
  assert.equal(await repairPaypalUrlLine(lines, async () => ({ text: "Rauschen" })), lines);
  assert.equal(await repairPaypalUrlLine(lines, async () => { throw new Error("boom"); }), lines);
});

test("keine Paypal-URL-Beschriftung → unverändert", async () => {
  const lines = [line([w("Vorname", 44, 117, 263), w("Thommy", 259, 372, 263)])];
  assert.equal(await repairPaypalUrlLine(lines, async () => ({ text: "https://paypal.com/x" })), lines);
});

import { pickPaypalReading, UNCERTAIN_REPAIR_CONFIDENCE } from "./repairPaypalUrlLine.js";

const url = (id) => `https://www.paypal.com/donate/?hosted_button_id=${id}`;

test("Lesung mit eingeschobenem Zeichen (14 statt 13) wird verworfen, die mit 13 Zeichen gewinnt", () => {
  const picked = pickPaypalReading([
    { text: url("Z9K6B8H3GK4AU"), confidence: 61 },
    { text: url("Z9IK6B8H3GK4AU"), confidence: 75 },
    { text: url("Z9IK6B8H3GK4AU"), confidence: 70 },
  ]);
  assert.equal(picked.url, url("Z9K6B8H3GK4AU"));
  // Nur EINE gültige Lesung → nicht als sicher gewertet (unter der Schwelle 60).
  assert.ok(picked.confidence <= UNCERTAIN_REPAIR_CONFIDENCE);
});

test("mindestens zwei übereinstimmende gültige Lesungen → sicher gelesen (Konfidenz bleibt)", () => {
  const picked = pickPaypalReading([
    { text: url("Q2KB9IRP3MBCR6"), confidence: 60 },
    { text: url("Q2KB9RP3MBCR6"), confidence: 88 },
    { text: url("Q2KB9RP3MBCR6"), confidence: 84 },
  ]);
  assert.equal(picked.url, url("Q2KB9RP3MBCR6"));
  assert.equal(picked.confidence, 88);
});

test("keine Lesung mit gültiger ID-Länge → erste Lesung, aber prüfbedürftig", () => {
  const picked = pickPaypalReading([{ text: url("ABC"), confidence: 90 }]);
  assert.equal(picked.url, url("ABC"));
  assert.equal(picked.confidence, UNCERTAIN_REPAIR_CONFIDENCE);
});

test("kein PayPal-Link in den Lesungen → null", () => {
  assert.equal(pickPaypalReading([{ text: "Rauschen" }]), null);
  assert.equal(pickPaypalReading([]), null);
});
