import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHumbeeMailSubject, buildHumbeeMailText } from "./humbeeMailContent.js";

test("Betreff entspricht exakt dem festgelegten Schema (Beispiel aus der Vorgabe)", () => {
  const subject = buildHumbeeMailSubject({
    federalState: "Bayern",
    region: "Regensburg Land",
    lastName: "Kopf",
    firstName: "Andreas",
  });

  assert.equal(subject, "Repräsentant Bayern / Regensburg Land / Kopf, Andreas");
});

test("Betreff enthält immer das Wort 'Repräsentant', unabhängig vom Geschlecht", () => {
  const subject = buildHumbeeMailSubject({
    federalState: "Hessen",
    region: "Frankfurt",
    lastName: "Muster",
    firstName: "Anna",
  });

  assert.match(subject, /^Repräsentant Hessen \/ Frankfurt \/ Muster, Anna$/);
});

test("Mailtext enthält Namen und IFK-ID, aber keine Signatur", () => {
  const text = buildHumbeeMailText({ firstName: "Max", lastName: "Mustermann", ifkId: "IFK7QX" });

  assert.match(text, /Für Max Mustermann wurden personalisierte Materialien erstellt und versendet\./);
  assert.match(text, /IFK-ID: IFK7QX/);
  assert.doesNotMatch(text, /Herzliche Grüße/);
  assert.doesNotMatch(text, /Dein Team/);
});
