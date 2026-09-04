import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepresentativeCertificateMailSubject,
  buildRepresentativeCertificateMailText,
  buildRepresentativeCertificateMailHtml,
} from "./representativeCertificateMailContent.js";

test("Betreff männlich", () => {
  assert.equal(buildRepresentativeCertificateMailSubject({ gender: "male" }), "Deine Urkunde als Repräsentant von It's for Kids");
});

test("Betreff weiblich", () => {
  assert.equal(buildRepresentativeCertificateMailSubject({ gender: "female" }), "Deine Urkunde als Repräsentantin von It's for Kids");
});

test("Betreff ohne Geschlecht fällt auf neutrale Form zurück (kein Absturz)", () => {
  assert.equal(buildRepresentativeCertificateMailSubject({}), "Deine Urkunde als Repräsentant von It's for Kids");
});

test("Text enthält Anrede, Rollenbezeichnung, Grußformel — keine technischen Details (kein IFK-ID, keine Anhangsliste)", () => {
  const text = buildRepresentativeCertificateMailText({ firstName: "Max", gender: "male" });
  assert.match(text, /Hallo Max,/);
  assert.match(text, /als Repräsentant unterstützt/);
  assert.match(text, /Ernennung/);
  assert.match(text, /Herzliche Grüße/);
  assert.doesNotMatch(text, /IFK-ID/);
});

test("Text weiblich nennt 'Repräsentantin'", () => {
  const text = buildRepresentativeCertificateMailText({ firstName: "Anna", gender: "female" });
  assert.match(text, /als Repräsentantin unterstützt/);
});

test("HTML enthält Logo und dieselbe IFK-Signatur wie die Materialien-Mail", () => {
  const html = buildRepresentativeCertificateMailHtml({ firstName: "Max", gender: "male", logoUrl: "https://example.com/logo.png" });
  assert.match(html, /https:\/\/example\.com\/logo\.png/);
  assert.match(html, /Herzliche Grüße/);
  assert.match(html, /Stiftung/);
});

test("keine 'undefined'/'null' in Text oder HTML, auch ohne Geschlecht", () => {
  const text = buildRepresentativeCertificateMailText({ firstName: "Max", gender: undefined });
  const html = buildRepresentativeCertificateMailHtml({ firstName: "Max", gender: undefined, logoUrl: "https://example.com/logo.png" });
  assert.doesNotMatch(text, /\b(undefined|null)\b/);
  assert.doesNotMatch(html, /\b(undefined|null)\b/);
});
