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

test("andere Wegbegleiter ohne Bundesland/Region: '{Rolle} / {Nachname}, {Vorname}' statt falscher 'Repräsentant'-Kennzeichnung", () => {
  assert.equal(
    buildHumbeeMailSubject({ lastName: "Muster", firstName: "Anna", role: "advisory_board" }),
    "Mitglied des Beirats / Muster, Anna"
  );
  assert.equal(
    buildHumbeeMailSubject({ lastName: "Yu", firstName: "Kim", role: "ambassador" }),
    "Botschafter / Yu, Kim"
  );
  assert.equal(
    buildHumbeeMailSubject({ lastName: "Feigenbutz", firstName: "Daniel", role: "curator" }),
    "Kurator / Feigenbutz, Daniel"
  );
});

test("Repräsentant mit role-Angabe behält das bisherige Region-Schema", () => {
  assert.equal(
    buildHumbeeMailSubject({
      federalState: "Bayern",
      region: "Regensburg Land",
      lastName: "Kopf",
      firstName: "Andreas",
      role: "representative",
    }),
    "Repräsentant Bayern / Regensburg Land / Kopf, Andreas"
  );
});

test("Mailtext enthält Namen und IFK-ID, aber keine Signatur", () => {
  const text = buildHumbeeMailText({ firstName: "Max", lastName: "Mustermann", ifkId: "IFK7QX" });

  assert.match(text, /Für Max Mustermann wurden personalisierte Materialien erstellt und versendet\./);
  assert.match(text, /IFK-ID: IFK7QX/);
  assert.doesNotMatch(text, /Herzliche Grüße/);
  assert.doesNotMatch(text, /Dein Team/);
});

test("Mailtext enthält keine Bestandteile der IFK-HTML-Signatur (Zitat, Anschrift, Vorstand, Datenschutz)", () => {
  const text = buildHumbeeMailText({ firstName: "Max", lastName: "Mustermann", ifkId: "IFK7QX" });

  assert.doesNotMatch(text, /Den Schwächsten helfen/);
  assert.doesNotMatch(text, /Zum Jägerhof/);
  assert.doesNotMatch(text, /Vorsitzender/);
  assert.doesNotMatch(text, /Datenschutz/);
  assert.doesNotMatch(text, /Bezirksregierung/);
});

test("fehlende IFK-ID: die IFK-ID-Zeile entfällt, kein 'undefined'", () => {
  for (const missing of [undefined, null, "", "   "]) {
    const text = buildHumbeeMailText({ firstName: "Max", lastName: "Mustermann", ifkId: missing });
    assert.doesNotMatch(text, /IFK-ID/);
    assert.doesNotMatch(text, /\b(undefined|null)\b/);
    assert.match(text, /Für Max Mustermann wurden personalisierte Materialien erstellt und versendet\./);
  }
});

test("IFK-ID wird getrimmt in die Zeile übernommen", () => {
  const text = buildHumbeeMailText({ firstName: "Max", lastName: "Mustermann", ifkId: "  IFK7QX  " });
  assert.match(text, /IFK-ID: IFK7QX$/);
});
