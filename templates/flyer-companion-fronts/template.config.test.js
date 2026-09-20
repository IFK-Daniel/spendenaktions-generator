import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  COMPANION_FLYER_FRONT_TEMPLATES_HOME,
  COMPANION_FLYER_FRONT_TEMPLATES_PRINT,
} from "./template.config.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../../core/materials/resolveRepresentativeFlyerFrontTemplate.js";
import { ROLE_KEY_LIST, ROLE_KEYS } from "../../core/materials/roleConfig.js";

const COMPANION_ROLES = ROLE_KEY_LIST.filter((role) => role !== ROLE_KEYS.REPRESENTATIVE);

test("jede Nicht-Repräsentanten-Rolle × Geschlecht × Ansprache hat Home- und Druck-Vorderseite mit vorhandenem Master", () => {
  for (const role of COMPANION_ROLES) {
    for (const gender of ["female", "male"]) {
      for (const salutation of ["du", "sie"]) {
        for (const table of [COMPANION_FLYER_FRONT_TEMPLATES_HOME, COMPANION_FLYER_FRONT_TEMPLATES_PRINT]) {
          const template = resolveRepresentativeFlyerFrontTemplate(table[role], gender, salutation);
          assert.ok(existsSync(fileURLToPath(template.background)), `${template.key}: Master fehlt`);
        }
      }
    }
  }
});

test("alle 40 Vorlagen haben eindeutige Keys und eigene Hintergrunddateien", () => {
  const keys = new Set();
  const backgrounds = new Set();
  for (const table of [COMPANION_FLYER_FRONT_TEMPLATES_HOME, COMPANION_FLYER_FRONT_TEMPLATES_PRINT]) {
    for (const role of COMPANION_ROLES) {
      for (const gender of ["female", "male"]) {
        for (const salutation of ["du", "sie"]) {
          keys.add(table[role][gender][salutation].key);
          backgrounds.add(String(table[role][gender][salutation].background));
        }
      }
    }
  }
  assert.equal(keys.size, 40);
  assert.equal(backgrounds.size, 40);
});

test("Home = Trimformat ohne Beschnitt, Druck = 1mm Beschnitt; Felder identisch, kein Regionsfeld", () => {
  const home = COMPANION_FLYER_FRONT_TEMPLATES_HOME.curator.female.du;
  const print = COMPANION_FLYER_FRONT_TEMPLATES_PRINT.curator.female.du;
  assert.equal(home.page.sourceBleedMm, 0);
  assert.equal(print.page.sourceBleedMm, 1);
  assert.equal(print.page.outputBleedMm, 1);
  assert.deepEqual(home.fields, print.fields);
  assert.equal(home.fields.region, undefined);
});

test("Botschafter: weiblich und männlich nutzen verschiedene Master; Du und Sie ebenfalls", () => {
  const t = COMPANION_FLYER_FRONT_TEMPLATES_HOME.ambassador;
  const files = [t.female.du, t.female.sie, t.male.du, t.male.sie].map((x) => String(x.background));
  assert.equal(new Set(files).size, 4);
  assert.match(String(t.female.du.background), /ambassador_female_du\.pdf$/);
  assert.match(String(t.male.sie.background), /ambassador_male_sie\.pdf$/);
});
