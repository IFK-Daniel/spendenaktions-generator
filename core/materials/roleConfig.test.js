import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_KEYS,
  ROLE_KEY_LIST,
  isValidRoleKey,
  getRoleConfig,
  roleRequiresRegion,
  getRoleLabel,
  isFlyerTemplateAvailableForRole,
  isCertificateTemplateAvailableForRole,
} from "./roleConfig.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

test("alle sechs Wegbegleiter-Typen sind vorhanden", () => {
  assert.deepEqual(
    [...ROLE_KEY_LIST].sort(),
    ["advisory_board", "ambassador", "curator", "economic_council", "expert_council", "representative"].sort()
  );
});

test("isValidRoleKey erkennt gültige und ungültige Schlüssel", () => {
  assert.equal(isValidRoleKey(ROLE_KEYS.REPRESENTATIVE), true);
  assert.equal(isValidRoleKey("nicht-vorhanden"), false);
  assert.equal(isValidRoleKey(undefined), false);
});

test("nur representative benötigt Bundesland/Region", () => {
  assert.equal(roleRequiresRegion(ROLE_KEYS.REPRESENTATIVE), true);
  for (const roleKey of ROLE_KEY_LIST) {
    if (roleKey === ROLE_KEYS.REPRESENTATIVE) continue;
    assert.equal(roleRequiresRegion(roleKey), false, `${roleKey} sollte keine Region benötigen`);
  }
});

test("getRoleConfig wirft bei unbekanntem Schlüssel", () => {
  assert.throws(() => getRoleConfig("nicht-vorhanden"), /unbekannter Wegbegleiter-Typ/);
});

test("Repräsentant/Repräsentantin je nach Geschlecht", () => {
  assert.equal(getRoleLabel(ROLE_KEYS.REPRESENTATIVE, "male"), "Repräsentant");
  assert.equal(getRoleLabel(ROLE_KEYS.REPRESENTATIVE, "female"), "Repräsentantin");
  assert.equal(getRoleLabel(ROLE_KEYS.REPRESENTATIVE, undefined), "Repräsentant");
});

test("Botschafter/Botschafterin je nach Geschlecht", () => {
  assert.equal(getRoleLabel(ROLE_KEYS.AMBASSADOR, "male"), "Botschafter");
  assert.equal(getRoleLabel(ROLE_KEYS.AMBASSADOR, "female"), "Botschafterin");
});

test("Kurator/Kuratorin je nach Geschlecht", () => {
  assert.equal(getRoleLabel(ROLE_KEYS.CURATOR, "male"), "Kurator");
  assert.equal(getRoleLabel(ROLE_KEYS.CURATOR, "female"), "Kuratorin");
});

test("Gremien (Wirtschaftsrat/Fachrat/Beirat) liefern für jedes Geschlecht dieselbe neutrale Form", () => {
  for (const roleKey of [ROLE_KEYS.ECONOMIC_COUNCIL, ROLE_KEYS.EXPERT_COUNCIL, ROLE_KEYS.ADVISORY_BOARD]) {
    const male = getRoleLabel(roleKey, "male");
    const female = getRoleLabel(roleKey, "female");
    const neutral = getRoleLabel(roleKey, undefined);
    assert.equal(male, female);
    assert.equal(male, neutral);
    assert.match(male, /^Mitglied des /);
  }
});

test("representative hat Flyer- und Urkunden-Vorlagen für die bestehenden Materialien", () => {
  assert.equal(
    isFlyerTemplateAvailableForRole(ROLE_KEYS.REPRESENTATIVE, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI),
    true
  );
  assert.equal(isFlyerTemplateAvailableForRole(ROLE_KEYS.REPRESENTATIVE, MATERIAL_TYPE_KEYS.FLYER_HOME), true);
  assert.equal(
    isCertificateTemplateAvailableForRole(ROLE_KEYS.REPRESENTATIVE, MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE),
    true
  );
});

test("alle anderen Rollen haben noch keine Flyer- oder Urkunden-Vorlage (kein stiller Fallback auf Repräsentant)", () => {
  for (const roleKey of ROLE_KEY_LIST) {
    if (roleKey === ROLE_KEYS.REPRESENTATIVE) continue;
    assert.equal(isFlyerTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI), false);
    assert.equal(isFlyerTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.FLYER_HOME), false);
    assert.equal(
      isCertificateTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE),
      false
    );
  }
});
