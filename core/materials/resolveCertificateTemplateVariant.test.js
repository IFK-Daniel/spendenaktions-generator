import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCertificateTemplateVariant } from "./resolveCertificateTemplateVariant.js";

const GENDERED = Object.freeze({ male: "MALE_TPL", female: "FEMALE_TPL" });
const NEUTRAL = Object.freeze({ neutral: "NEUTRAL_TPL" });

test("Repräsentant/Botschafter male → männliche Vorlage", () => {
  assert.equal(resolveCertificateTemplateVariant(GENDERED, "male"), "MALE_TPL");
});

test("Repräsentant/Botschafter female → weibliche Vorlage (nie die männliche)", () => {
  assert.equal(resolveCertificateTemplateVariant(GENDERED, "female"), "FEMALE_TPL");
});

test("geschlechtsspezifische Urkunde ohne gender wirft (kein stiller Fallback auf männlich)", () => {
  assert.throws(() => resolveCertificateTemplateVariant(GENDERED, undefined), /gender/);
  assert.throws(() => resolveCertificateTemplateVariant(GENDERED, ""), /gender/);
  assert.throws(() => resolveCertificateTemplateVariant(GENDERED, "divers"), /gender/);
});

test("Gremien-Urkunde: neutrale Vorlage unabhängig vom Geschlecht", () => {
  assert.equal(resolveCertificateTemplateVariant(NEUTRAL, undefined), "NEUTRAL_TPL");
  assert.equal(resolveCertificateTemplateVariant(NEUTRAL, "male"), "NEUTRAL_TPL");
  assert.equal(resolveCertificateTemplateVariant(NEUTRAL, "female"), "NEUTRAL_TPL");
});

test("unbekannte Rolle (kein Eintrag) wirft eine klare Fehlermeldung", () => {
  assert.throws(() => resolveCertificateTemplateVariant(undefined, "male"), /keine Urkunden-Vorlage/);
  assert.throws(() => resolveCertificateTemplateVariant(null, "female"), /keine Urkunden-Vorlage/);
});
