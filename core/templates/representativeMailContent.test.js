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
