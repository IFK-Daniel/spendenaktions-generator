import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIfkSignatureHtml } from "./ifkSignature.js";

test("enthält Grußformel und Team-Zeile", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /Herzliche Grüße/);
  assert.match(html, /Dein Team von It's for Kids/);
});

test("enthält das Zitat mit Attribution", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /Den Schwächsten helfen – heißt, die Gesellschaft stärken/);
  assert.match(html, /Rainer Koch, Gründer der Stiftung It's for Kids/);
});

test("enthält das IFK-Logo", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /<img src="https:\/\/example\.com\/logo\.png"/);
});

test("enthält Anschrift, E-Mail und Web", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /Zum Jägerhof 2, 40724 Hilden/);
  assert.match(html, /info@its-for-kids\.de/);
  assert.match(html, /www\.its-for-kids\.de/);
});

test("enthält die Spendenkonto-IBAN", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /DE48 3008 0000 0228 2288 00/);
});

test("enthält Vorstand, Stiftungsnamen, Aufsichtsbehörde und Registriernummer", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /Rainer Koch \(1\. Vorsitzender\)/);
  assert.match(html, /Tobias Mehwitz \(2\. Vorsitzender\)/);
  assert.match(html, /Stiftung It's for Kids/);
  assert.match(html, /Bezirksregierung Düsseldorf/);
  assert.match(html, /RegNr 21\.13 – St\.1820/);
});

test("enthält Datenschutzlink und Datenschutzkontakt", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /href="https:\/\/www\.its-for-kids\.de\/datenschutz"/);
  assert.match(html, /Datenschutzkontakt: <a href="mailto:info@datenschutzkonzept\.com"/);
});

test("enthält den deutschen und englischen Vertraulichkeitshinweis", () => {
  const html = buildIfkSignatureHtml({ logoUrl: "https://example.com/logo.png" });
  assert.match(html, /vertrauliche und\/oder rechtlich geschützte Informationen/);
  assert.match(html, /confidential and\/or privileged information/);
});
