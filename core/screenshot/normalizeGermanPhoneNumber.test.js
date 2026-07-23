import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGermanPhoneNumber } from "./normalizeGermanPhoneNumber.js";

test("+49 wird zu führender 0 umgewandelt", () => {
  assert.equal(normalizeGermanPhoneNumber("+49 1523 3795099"), "01523 3795099");
});

test("0049 wird zu führender 0 umgewandelt", () => {
  assert.equal(normalizeGermanPhoneNumber("0049 2103 986670"), "02103 986670");
});

test("+49 ohne Leerzeichen nach der Vorwahl wird korrekt umgewandelt", () => {
  assert.equal(normalizeGermanPhoneNumber("+491523795099"), "01523795099");
});

test("österreichische Vorwahl +43 bleibt unverändert", () => {
  assert.equal(normalizeGermanPhoneNumber("+43 664 1234567"), "+43 664 1234567");
});

test("schweizer Vorwahl +41 bleibt unverändert", () => {
  assert.equal(normalizeGermanPhoneNumber("+41 79 1234567"), "+41 79 1234567");
});

test("bereits inländische Schreibweise bleibt unverändert", () => {
  assert.equal(normalizeGermanPhoneNumber("0152 33795099"), "0152 33795099");
});

test("Nicht-String-Eingabe wird unverändert zurückgegeben", () => {
  assert.equal(normalizeGermanPhoneNumber(undefined), undefined);
});
