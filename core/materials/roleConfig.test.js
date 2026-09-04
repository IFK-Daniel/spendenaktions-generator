import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_KEYS,
  ROLE_KEY_LIST,
  isValidRoleKey,
  getRoleConfig,
  roleRequiresRegion,
  getRoleLabel,
  getCertificateMaterialKey,
  certificateRequiresGender,
  isFlyerTemplateAvailableForRole,
  isCertificateTemplateAvailableForRole,
  getFlyerBackTemplateKey,
  SHARED_FLYER_BACK_KEY,
} from "./roleConfig.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";
import { sharedFlyerBackTemplate, SHARED_FLYER_BACK_KEY as TEMPLATE_BACK_KEY } from "../../templates/flyer-shared-back/template.config.js";

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

test("jede Rolle hat genau einen eigenen Urkunden-Materialschlüssel — kein Fallback auf die Repräsentantenurkunde", () => {
  const expected = {
    [ROLE_KEYS.REPRESENTATIVE]: MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE,
    [ROLE_KEYS.AMBASSADOR]: MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR,
    [ROLE_KEYS.ADVISORY_BOARD]: MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD,
    [ROLE_KEYS.CURATOR]: MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM,
    [ROLE_KEYS.EXPERT_COUNCIL]: MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL,
    [ROLE_KEYS.ECONOMIC_COUNCIL]: MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL,
  };
  for (const roleKey of ROLE_KEY_LIST) {
    assert.equal(getCertificateMaterialKey(roleKey), expected[roleKey], `${roleKey} Urkunden-Schlüssel`);
    // Die eigene Urkunde ist verfügbar …
    assert.equal(isCertificateTemplateAvailableForRole(roleKey, expected[roleKey]), true);
    // … eine fremde Rollen-Urkunde niemals (kein stiller Fallback).
    if (roleKey !== ROLE_KEYS.REPRESENTATIVE) {
      assert.equal(
        isCertificateTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE),
        false
      );
    }
  }
});

test("nur Repräsentant und Botschafter benötigen Geschlecht für die Urkunde (Gremien-Urkunden sind neutral)", () => {
  assert.equal(certificateRequiresGender(ROLE_KEYS.REPRESENTATIVE), true);
  assert.equal(certificateRequiresGender(ROLE_KEYS.AMBASSADOR), true);
  for (const roleKey of [
    ROLE_KEYS.ADVISORY_BOARD,
    ROLE_KEYS.CURATOR,
    ROLE_KEYS.EXPERT_COUNCIL,
    ROLE_KEYS.ECONOMIC_COUNCIL,
  ]) {
    assert.equal(certificateRequiresGender(roleKey), false, `${roleKey} sollte kein Geschlecht für die Urkunde verlangen`);
  }
});

test("für andere Rollen als Repräsentant ist weiterhin keine FLYER-Vorlage hinterlegt (kein stiller Fallback)", () => {
  for (const roleKey of ROLE_KEY_LIST) {
    if (roleKey === ROLE_KEYS.REPRESENTATIVE) continue;
    assert.equal(isFlyerTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI), false);
    assert.equal(isFlyerTemplateAvailableForRole(roleKey, MATERIAL_TYPE_KEYS.FLYER_HOME), false);
  }
});

test("jede Rolle verweist auf die eine gemeinsame Flyer-Rückseite (Rollenarchitektur ist auf shared back vorbereitet)", () => {
  for (const roleKey of ROLE_KEY_LIST) {
    assert.equal(
      getFlyerBackTemplateKey(roleKey),
      SHARED_FLYER_BACK_KEY,
      `${roleKey} sollte die gemeinsame Rückseite referenzieren`
    );
  }
});

test("der shared-back-Schlüssel in roleConfig stimmt mit der Template-Config überein", () => {
  assert.equal(SHARED_FLYER_BACK_KEY, TEMPLATE_BACK_KEY);
  assert.equal(sharedFlyerBackTemplate.key, SHARED_FLYER_BACK_KEY);
});

test("die gemeinsame Rückseite ist statisch: keine dynamischen Felder, keine Cover", () => {
  assert.deepEqual(sharedFlyerBackTemplate.fields, {});
  assert.deepEqual(sharedFlyerBackTemplate.legacyContentCovers, []);
  assert.equal(sharedFlyerBackTemplate.page.trimWidthMm, 148);
  assert.equal(sharedFlyerBackTemplate.page.trimHeightMm, 210);
  assert.equal(sharedFlyerBackTemplate.page.outputBleedMm, 0);
});
