import { test } from "node:test";
import assert from "node:assert/strict";
import { pickEmailForForm } from "./pickEmailForForm.js";

test("IFK-Mailadresse wird gegenüber der normalen Mail-Adresse bevorzugt", () => {
  const result = pickEmailForForm(
    { value: "d.feigenbutz@its-for-kids.de", status: "recognized" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, { value: "d.feigenbutz@its-for-kids.de", source: "ifkEmail" });
});

test("Fallback auf die normale Mail-Adresse, wenn die IFK-Mailadresse fehlt", () => {
  const result = pickEmailForForm(
    { value: "", status: "not_recognized" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, { value: "daniel@beispiel.de", source: "regularEmail" });
});

test("Fallback auf die normale Mail-Adresse, wenn die IFK-Mailadresse ungültig ist", () => {
  const result = pickEmailForForm(
    { value: "kaputt", status: "needs_review" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, { value: "daniel@beispiel.de", source: "regularEmail" });
});

test("beide Adressen fehlen: leerer Wert ohne Quelle", () => {
  const result = pickEmailForForm(
    { value: "", status: "not_recognized" },
    { value: "", status: "not_recognized" }
  );
  assert.deepEqual(result, { value: "", source: null });
});
