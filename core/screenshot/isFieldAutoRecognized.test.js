import { test } from "node:test";
import assert from "node:assert/strict";
import { isFieldAutoRecognized } from "./isFieldAutoRecognized.js";

test("recognized, nie geprüft/geändert -> automatisch erkannt (Normalfall, z. B. Vorname/Telefonnummer)", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "recognized", wasManuallyModified: false, wasManuallyReviewed: false }),
    true
  );
});

test("needs_review, nie geprüft -> nicht automatisch erkannt (wurde auch nicht übernommen)", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "needs_review", wasManuallyModified: false, wasManuallyReviewed: false }),
    false
  );
});

test("needs_review, über die Korrektur-Tabelle unverändert bestätigt -> automatisch erkannt (der eigentliche Bugfix: E-Mail/PayPal)", () => {
  // Lange Werte wie E-Mail-Adressen oder PayPal-Links landen wegen ihrer
  // Länge deutlich häufiger bei `needs_review` (mind. ein unsicheres
  // Zeichen) als kurze Felder — werden sie unverändert bestätigt, stammen
  // sie trotzdem weiterhin unverändert aus dem Screenshot.
  assert.equal(
    isFieldAutoRecognized({ status: "needs_review", wasManuallyModified: false, wasManuallyReviewed: true }),
    true
  );
});

test("needs_review, über die Korrektur-Tabelle tatsächlich geändert -> NICHT automatisch erkannt (manually_modified)", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "needs_review", wasManuallyModified: true, wasManuallyReviewed: true }),
    false
  );
});

test("recognized, aber nachträglich manuell geändert -> NICHT automatisch erkannt", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "recognized", wasManuallyModified: true, wasManuallyReviewed: true }),
    false
  );
});

test("not_recognized/confirmed_empty, nie geprüft -> nicht automatisch erkannt", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "not_recognized", wasManuallyModified: false, wasManuallyReviewed: false }),
    false
  );
  assert.equal(
    isFieldAutoRecognized({ status: "confirmed_empty", wasManuallyModified: false, wasManuallyReviewed: false }),
    false
  );
});

test("wasManuallyModified hat immer Vorrang, unabhängig vom Status", () => {
  assert.equal(
    isFieldAutoRecognized({ status: "recognized", wasManuallyModified: true, wasManuallyReviewed: false }),
    false
  );
});
