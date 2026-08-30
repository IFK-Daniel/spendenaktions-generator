import { test } from "node:test";
import assert from "node:assert/strict";
import { pickEmailForForm } from "./pickEmailForForm.js";

test("IFK-Mailadresse wird gegenüber der normalen Mail-Adresse bevorzugt", () => {
  const result = pickEmailForForm(
    { value: "d.feigenbutz@its-for-kids.de", status: "recognized" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, {
    value: "d.feigenbutz@its-for-kids.de",
    source: "ifkEmail",
    status: "recognized",
  });
});

test("Fallback auf die normale Mail-Adresse, wenn die IFK-Mailadresse fehlt", () => {
  const result = pickEmailForForm(
    { value: "", status: "not_recognized" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, { value: "daniel@beispiel.de", source: "regularEmail", status: "recognized" });
});

test("saubere normale Mail-Adresse schlägt eine nur prüfbedürftige IFK-Mailadresse", () => {
  const result = pickEmailForForm(
    { value: "d.feigenbutz@its-for-kids,de", status: "needs_review" },
    { value: "daniel@beispiel.de", status: "recognized" }
  );
  assert.deepEqual(result, { value: "daniel@beispiel.de", source: "regularEmail", status: "recognized" });
});

test("prüfbedürftige IFK-Mailadresse wird übernommen, wenn keine saubere Adresse vorhanden ist", () => {
  const result = pickEmailForForm(
    { value: "d.feigenbutz@its-for-kids,de", status: "needs_review" },
    { value: "", status: "not_recognized" }
  );
  assert.deepEqual(result, {
    value: "d.feigenbutz@its-for-kids,de",
    source: "ifkEmail",
    status: "needs_review",
  });
});

test("prüfbedürftige normale Mail-Adresse wird übernommen, wenn sonst nichts vorhanden ist (im Screenshot vorhandene Adresse geht nie verloren)", () => {
  const result = pickEmailForForm(
    { value: "", status: "not_recognized" },
    { value: "daniel@beispiel", status: "needs_review" }
  );
  assert.deepEqual(result, { value: "daniel@beispiel", source: "regularEmail", status: "needs_review" });
});

test("beide Adressen fehlen: leerer Wert ohne Quelle", () => {
  const result = pickEmailForForm(
    { value: "", status: "not_recognized" },
    { value: "", status: "not_recognized" }
  );
  assert.deepEqual(result, { value: "", source: null, status: "not_recognized" });
});

test("robust gegen fehlende Argumente", () => {
  assert.deepEqual(pickEmailForForm(undefined, undefined), {
    value: "",
    source: null,
    status: "not_recognized",
  });
});
