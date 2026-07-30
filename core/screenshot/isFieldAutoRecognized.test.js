import { test } from "node:test";
import assert from "node:assert/strict";
import { isFieldAutoRecognized } from "./isFieldAutoRecognized.js";

test("recognized, nie geprüft -> automatisch erkannt (Normalfall, z. B. Vorname/Telefonnummer)", () => {
  assert.equal(isFieldAutoRecognized({ status: "recognized", wasManuallyReviewed: false }), true);
});

test("needs_review, nie geprüft -> nicht automatisch erkannt (wurde auch nicht übernommen)", () => {
  assert.equal(isFieldAutoRecognized({ status: "needs_review", wasManuallyReviewed: false }), false);
});

test("needs_review, über die Korrektur-Tabelle unverändert bestätigt -> automatisch erkannt (E-Mail/PayPal ohne Tippfehler)", () => {
  // Lange Werte wie E-Mail-Adressen oder PayPal-Links landen wegen ihrer
  // Länge deutlich häufiger bei `needs_review` (mind. ein unsicheres
  // Zeichen) als kurze Felder — werden sie unverändert bestätigt, stammen
  // sie trotzdem weiterhin unverändert aus dem Screenshot.
  assert.equal(isFieldAutoRecognized({ status: "needs_review", wasManuallyReviewed: true }), true);
});

test("needs_review, über die Korrektur-Tabelle tatsächlich berichtigt -> weiterhin automatisch erkannt (der eigentliche Bugfix: E-Mail/PayPal mit korrigiertem Zeichen)", () => {
  // Das Berichtigen eines von der OCR als unsicher markierten Zeichens ist
  // Teil des vorgesehenen Korrektur-Workflows für `needs_review`-Felder,
  // keine eigenständige manuelle Erfassung — das Feld bleibt "importiert".
  assert.equal(isFieldAutoRecognized({ status: "needs_review", wasManuallyReviewed: true }), true);
});

test("not_recognized/confirmed_empty, nie geprüft -> nicht automatisch erkannt", () => {
  assert.equal(isFieldAutoRecognized({ status: "not_recognized", wasManuallyReviewed: false }), false);
  assert.equal(isFieldAutoRecognized({ status: "confirmed_empty", wasManuallyReviewed: false }), false);
});

test("recognized hat immer Vorrang, auch ohne dass es über die Tabelle geprüft wurde", () => {
  assert.equal(isFieldAutoRecognized({ status: "recognized", wasManuallyReviewed: false }), true);
});
