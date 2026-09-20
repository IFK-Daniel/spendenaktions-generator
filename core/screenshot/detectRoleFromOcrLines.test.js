import test from "node:test";
import assert from "node:assert/strict";
import { detectRoleFromOcrLines } from "./detectRoleFromOcrLines.js";
import { ROLE_KEYS } from "../materials/roleConfig.js";

const lines = (...texts) => texts.map((text) => ({ text }));

// Echte OCR-Zeilen des Botschafter-Screenshots (Sept. 2026).
const AMBASSADOR_SCREENSHOT = lines(
  "mn a Me Sn a N AA AA",
  "Botschafter / Böhlig, Thommy-Luke",
  "Botschafter Böhlig, Thommy-Luke %",
  'Mail "Willkommen als',
  'Botschafter" Nicht notwendig',
  "verschicken",
  "Vorname Thommy-Luke"
);

test("Botschafter-Screenshot → ambassador", () => {
  assert.equal(detectRoleFromOcrLines(AMBASSADOR_SCREENSHOT), ROLE_KEYS.AMBASSADOR);
});

test("nur Kopfzeile oder nur Wertzeile reicht", () => {
  assert.equal(detectRoleFromOcrLines(lines("Botschafter / Böhlig, Thommy-Luke")), ROLE_KEYS.AMBASSADOR);
  assert.equal(detectRoleFromOcrLines(lines("Botschafter Böhlig, Thommy-Luke %")), ROLE_KEYS.AMBASSADOR);
});

test("alle Wegbegleiter-Typen inkl. weiblicher Formen", () => {
  const cases = [
    ["Repräsentant / Mustermann, Max", ROLE_KEYS.REPRESENTATIVE],
    ["Repräsentantin / Musterfrau, Erika", ROLE_KEYS.REPRESENTATIVE],
    ["Botschafterin / Musterfrau, Erika", ROLE_KEYS.AMBASSADOR],
    ["Beirat / Mustermann, Max", ROLE_KEYS.ADVISORY_BOARD],
    ["Beirätin / Musterfrau, Erika", ROLE_KEYS.ADVISORY_BOARD],
    ["Kurator / Mustermann, Max", ROLE_KEYS.CURATOR],
    ["Kuratorin / Musterfrau, Erika", ROLE_KEYS.CURATOR],
    ["Kuratorium / Mustermann, Max", ROLE_KEYS.CURATOR],
    ["Wirtschaftsrat / Mustermann, Max", ROLE_KEYS.ECONOMIC_COUNCIL],
    ["Fachrat / Mustermann, Max", ROLE_KEYS.EXPERT_COUNCIL],
    ["Fachlicher Rat / Mustermann, Max", ROLE_KEYS.EXPERT_COUNCIL],
    ["Mitglied des Wirtschaftsrates / Mustermann, Max", ROLE_KEYS.ECONOMIC_COUNCIL],
  ];
  for (const [text, expected] of cases) {
    assert.equal(detectRoleFromOcrLines(lines(text)), expected, text);
  }
});

test("Kategorie-Zeile und Hinweistexte lösen nichts aus", () => {
  assert.equal(
    detectRoleFromOcrLines(lines("Wegbegleiter (Vorstand, Beirat, Kuratoren, Wirtschaftsrat, Fachlicher Rat, Botschafter)")),
    null
  );
  assert.equal(detectRoleFromOcrLines(lines('Mail "Willkommen als', 'Botschafter" Nicht notwendig')), null);
  assert.equal(detectRoleFromOcrLines(lines("Botschafter", "Vorname Thommy-Luke")), null);
});

test("widersprüchliche Typen → null (Auswahl bleibt unverändert)", () => {
  assert.equal(detectRoleFromOcrLines(lines("Botschafter / Böhlig, Thommy", "Beirat Böhlig, Thommy")), null);
});

test("leere/ungültige Eingaben → null", () => {
  assert.equal(detectRoleFromOcrLines([]), null);
  assert.equal(detectRoleFromOcrLines(undefined), null);
  assert.equal(detectRoleFromOcrLines([{}, { text: 5 }]), null);
});
