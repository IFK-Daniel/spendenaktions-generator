import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlyerVariantEntries } from "./buildFlyerVariantEntries.js";
import { ROLE_KEYS } from "./roleConfig.js";

const TABLE = {
  female: { du: { key: "F_DU" }, sie: { key: "F_SIE" } },
  male: { du: { key: "M_DU" }, sie: { key: "M_SIE" } },
};

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

test("female + Flyer Druckerei → genau female-du + female-sie", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "female",
    frontTemplatesByGenderAndSalutation: TABLE,
  });
  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((j) => j.templateConfig.key),
    ["F_DU", "F_SIE"]
  );
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    ["IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf", "IFK_Max_Mustermann_Flyer_Druckerei_Sie.pdf"]
  );
  assert.deepEqual(
    jobs.map((j) => j.entry.label),
    ["Flyer Druckerei – Du", "Flyer Druckerei – Sie"]
  );
});

test("male + Flyer Druckerei → genau male-du + male-sie", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "male",
    frontTemplatesByGenderAndSalutation: TABLE,
  });
  assert.deepEqual(
    jobs.map((j) => j.templateConfig.key),
    ["M_DU", "M_SIE"]
  );
});

test("female + Flyer Home → genau female-du + female-sie", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "female",
    frontTemplatesByGenderAndSalutation: TABLE,
  });
  assert.deepEqual(
    jobs.map((j) => j.entry.filename),
    ["IFK_Max_Mustermann_Flyer_Home_Du.pdf", "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"]
  );
});

test("male + Flyer Home → genau male-du + male-sie", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "male",
    frontTemplatesByGenderAndSalutation: TABLE,
  });
  assert.deepEqual(
    jobs.map((j) => j.templateConfig.key),
    ["M_DU", "M_SIE"]
  );
});

test("Druckerei UND Home ausgewählt → vier Aufträge (2 Materialien × 2 Ansprachen)", () => {
  const jobs = buildFlyerVariantEntries({
    entries: [druckereiEntry(), homeEntry()],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "female",
    frontTemplatesByGenderAndSalutation: TABLE,
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
  const jobs = buildFlyerVariantEntries({
    entries: [],
    roleKey: ROLE_KEYS.REPRESENTATIVE,
    gender: "female",
    frontTemplatesByGenderAndSalutation: TABLE,
  });
  assert.deepEqual(jobs, []);
});

test("Rolle ohne konfigurierte Ansprache-Variante wirft (kein stiller Fallback auf eine Variante)", () => {
  assert.throws(
    () =>
      buildFlyerVariantEntries({
        entries: [druckereiEntry()],
        roleKey: ROLE_KEYS.AMBASSADOR,
        gender: "female",
        frontTemplatesByGenderAndSalutation: TABLE,
      }),
    /keine Flyer-Ansprachevariante hinterlegt/
  );
});

test("ungültiges Geschlecht wirft (über resolveRepresentativeFlyerFrontTemplate)", () => {
  assert.throws(
    () =>
      buildFlyerVariantEntries({
        entries: [druckereiEntry()],
        roleKey: ROLE_KEYS.REPRESENTATIVE,
        gender: undefined,
        frontTemplatesByGenderAndSalutation: TABLE,
      }),
    /Geschlecht/
  );
});
