import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepresentativeMailSubject,
  buildRepresentativeMailText,
  buildRepresentativeMailHtml,
} from "./representativeMailContent.js";

test("Betreff entspricht exakt der Vorgabe", () => {
  assert.equal(buildRepresentativeMailSubject(), "Deine personalisierten Materialien von It's for Kids");
});

test("gender 'male' erzeugt die Rollenbezeichnung 'Repräsentant' im Text", () => {
  const text = buildRepresentativeMailText({ firstName: "Max", gender: "male", ifkId: "IFK7QX" });
  assert.match(text, /Einsatz als Repräsentant von It's for Kids/);
  assert.doesNotMatch(text, /Repräsentantin/);
});

test("gender 'female' erzeugt die Rollenbezeichnung 'Repräsentantin' im Text", () => {
  const text = buildRepresentativeMailText({ firstName: "Anna", gender: "female", ifkId: "IFK7QX" });
  assert.match(text, /Einsatz als Repräsentantin von It's for Kids/);
});

test("Text enthält Anrede, IFK-ID und Grußformel", () => {
  const text = buildRepresentativeMailText({ firstName: "Max", gender: "male", ifkId: "IFK7QX" });
  assert.match(text, /^Hallo Max,/);
  assert.match(text, /IFK-ID lautet: IFK7QX/);
  assert.match(text, /Herzliche Grüße/);
  assert.match(text, /Dein Team von It's for Kids/);
});

test("HTML-Version enthält Logo, Rollenbezeichnung und IFK-ID", () => {
  const html = buildRepresentativeMailHtml({
    firstName: "Anna",
    gender: "female",
    ifkId: "IFK7QX",
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(html, /<img src="https:\/\/example\.com\/logo\.png"/);
  assert.match(html, /Repräsentantin/);
  assert.match(html, /IFK7QX/);
});

test("HTML-Version enthält die vollständige IFK-Signatur", () => {
  const html = buildRepresentativeMailHtml({
    firstName: "Max",
    gender: "male",
    ifkId: "IFK7QX",
    logoUrl: "https://example.com/logo.png",
  });

  assert.match(html, /Herzliche Grüße/);
  assert.match(html, /Dein Team von It's for Kids/);
  assert.match(html, /Den Schwächsten helfen – heißt, die Gesellschaft stärken/);
  assert.match(html, /Rainer Koch, Gründer der Stiftung It's for Kids/);
  assert.match(html, /Zum Jägerhof 2, 40724 Hilden/);
  assert.match(html, /info@its-for-kids\.de/);
  assert.match(html, /www\.its-for-kids\.de/);
  assert.match(html, /DE48 3008 0000 0228 2288 00/);
  assert.match(html, /Rainer Koch \(1\. Vorsitzender\)/);
  assert.match(html, /Tobias Mehwitz \(2\. Vorsitzender\)/);
  assert.match(html, /Bezirksregierung Düsseldorf/);
  assert.match(html, /RegNr 21\.13 – St\.1820/);
  assert.match(html, /Datenschutzerklärung/);
  assert.match(html, /Datenschutzkontakt/);
  assert.match(html, /vertrauliche und\/oder rechtlich geschützte Informationen/);
  assert.match(html, /confidential and\/or privileged information/);
});

test("Grußformel erscheint im HTML nur einmal (kein Duplikat aus Fließtext und Signatur)", () => {
  const html = buildRepresentativeMailHtml({
    firstName: "Max",
    gender: "male",
    ifkId: "IFK7QX",
    logoUrl: "https://example.com/logo.png",
  });

  const matches = html.match(/Herzliche Grüße/g) ?? [];
  assert.equal(matches.length, 1);
});
