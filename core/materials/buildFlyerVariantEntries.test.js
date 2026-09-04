import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlyerVariantEntries } from "./buildFlyerVariantEntries.js";
import { ROLE_KEYS } from "./roleConfig.js";

function druckereiEntry() {
  return {
    key: "FLYER_DRUCKEREI",
    label: "Flyer Druckerei",
    category: "flyer",
    format: "pdf",
    extension: "pdf",
    filename: "IFK_Max_Mustermann_Flyer_Druckerei.pdf",
  };
}

function homeEntry() {
  return {
    key: "FLYER_HOME",
    label: "Flyer Home",
    category: "flyer",
    format: "pdf",
    extension: "pdf",
    filename: "IFK_Max_Mustermann_Flyer_Home.pdf",
  };
}

test("ohne salutationVariants → Standard ist ausschließlich 'du' (Du-Stiftung, keine automatische Sie-Erzeugung mehr)", () => {
  const jobs = buildFlyerVariantEntries({ entries: [druckereiEntry()], roleKey: ROLE_KEYS.REPRESENTATIVE });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].salutation, "du");
  assert.equal(jobs[0].entry.filename, "IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf");
  assert.equal(jobs[0].entry.label, "Flyer Druckerei – Du");
});

test("salutationVariants: ['du','sie'] → genau zwei Aufträge, du + sie, mit variantenspezifischem Dateinamen/Label", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    salutationVariants: ["du", "sie"],
  });
  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((j) => j.salutation),
    ["du", "sie"]
  );
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    ["IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf", "IFK_Max_Mustermann_Flyer_Druckerei_Sie.pdf"]
  );
  assert.deepEqual(
    jobs.map((j) => j.entry.label),
    ["Flyer Druckerei – Du", "Flyer Druckerei – Sie"]
  );
  // key/category/format/extension bleiben je Auftrag unverändert (nur
  // filename/label sind ansprache-spezifisch).
  for (const job of jobs) {
    assert.equal(job.entry.key, "FLYER_DRUCKEREI");
    assert.equal(job.entry.category, "flyer");
  }
});

test("salutationVariants: ['sie'] → nur die Sie-Variante wird angefordert (z. B. nachträglich für einen bestehenden Repräsentanten)", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry(), homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    salutationVariants: ["sie"],
  });
  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    ["IFK_Max_Mustermann_Flyer_Druckerei_Sie.pdf", "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"]
  );
});

test("Flyer Home → mit ['du','sie'] zwei Aufträge, du + sie", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    salutationVariants: ["du", "sie"],
  });
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    ["IFK_Max_Mustermann_Flyer_Home_Du.pdf", "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"]
  );
});

test("Druckerei UND Home ausgewählt, ['du','sie'] → vier Aufträge (2 Materialien × 2 Ansprachen)", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry(), homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    salutationVariants: ["du", "sie"],
  });
  assert.equal(jobs.length, 4);
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    [
      "IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf",
      "IFK_Max_Mustermann_Flyer_Druckerei_Sie.pdf",
      "IFK_Max_Mustermann_Flyer_Home_Du.pdf",
      "IFK_Max_Mustermann_Flyer_Home_Sie.pdf",
    ]
  );
});

test("keine Flyer-Einträge → keine Aufträge, keine Doppelung", () => {
  const jobs = buildFlyerVariantEntries({ entries: [], roleKey: ROLE_KEYS.REPRESENTATIVE, salutationVariants: ["du", "sie"] });
  assert.deepEqual(jobs, []);
});

test("Rolle ohne konfigurierte Ansprache-Variante wirft (kein stiller Fallback auf eine Variante) — z. B. Urkunde/QR-only Rollen betrifft das nicht, da dort keine Flyer-Einträge existieren", () => {
  assert.throws(
    () => buildFlyerVariantEntries({ entries: [druckereiEntry()], roleKey: ROLE_KEYS.AMBASSADOR }),
    /keine Flyer-Ansprachevariante hinterlegt/
  );
});

test("unbekannte Rolle wirft ebenfalls (über getFlyerSalutationVariants -> getRoleConfig)", () => {
  assert.throws(() => buildFlyerVariantEntries({ entries: [druckereiEntry()], roleKey: "not-a-role" }));
});

test("eine angeforderte, für die Rolle nicht verfügbare Ansprache-Variante wirft mit konkreter Fehlermeldung", () => {
  assert.throws(
    () =>
      buildFlyerVariantEntries({
        entries: [druckereiEntry()],
        roleKey: ROLE_KEYS.REPRESENTATIVE,
        salutationVariants: ["du", "hochdeutsch"],
      }),
    /Ansprache-Variante "hochdeutsch" ist für den Wegbegleiter-Typ "representative" nicht verfügbar/
  );
});
