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
