import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRepresentativeFlyerFrontTemplate } from "./resolveRepresentativeFlyerFrontTemplate.js";

const TABLE = {
  female: { du: "F_DU", sie: "F_SIE" },
  male: { du: "M_DU", sie: "M_SIE" },
};

test("female + du → weibliche Du-Vorderseite", () => {
  assert.equal(resolveRepresentativeFlyerFrontTemplate(TABLE, "female", "du"), "F_DU");
});

test("female + sie → weibliche Sie-Vorderseite", () => {
  assert.equal(resolveRepresentativeFlyerFrontTemplate(TABLE, "female", "sie"), "F_SIE");
});

test("male + du → männliche Du-Vorderseite", () => {
  assert.equal(resolveRepresentativeFlyerFrontTemplate(TABLE, "male", "du"), "M_DU");
});

test("male + sie → männliche Sie-Vorderseite", () => {
  assert.equal(resolveRepresentativeFlyerFrontTemplate(TABLE, "male", "sie"), "M_SIE");
});

test("fehlendes Geschlecht → wirft, kein stiller Fallback", () => {
  assert.throws(() => resolveRepresentativeFlyerFrontTemplate(TABLE, undefined, "du"), /Geschlecht/);
});

test("unbekanntes Geschlecht → wirft", () => {
  assert.throws(() => resolveRepresentativeFlyerFrontTemplate(TABLE, "divers", "du"), /Geschlecht/);
});

test("fehlende Ansprache → wirft, kein stiller Fallback", () => {
  assert.throws(() => resolveRepresentativeFlyerFrontTemplate(TABLE, "female", undefined), /Ansprache/);
});

test("unbekannte Ansprache → wirft", () => {
  assert.throws(() => resolveRepresentativeFlyerFrontTemplate(TABLE, "female", "ihr"), /Ansprache/);
});

test("ungültige/fehlende Tabelle → wirft", () => {
  assert.throws(() => resolveRepresentativeFlyerFrontTemplate(undefined, "female", "du"), /Vorlagentabelle/);
});

test("gültige Kombination ohne hinterlegte Vorlage → wirft (kein undefined)", () => {
  assert.throws(
    () => resolveRepresentativeFlyerFrontTemplate({ female: { du: "F_DU" }, male: {} }, "female", "sie"),
    /keine Vorderseiten-Vorlage für die Kombination/
  );
});

test("die vier realen Vorderseiten-Configs lösen zur richtigen Datei auf", async () => {
  const [fdu, fsie, mdu, msie] = await Promise.all([
    import("../../templates/flyer-representative-female-du-front/template.config.js"),
    import("../../templates/flyer-representative-female-sie-front/template.config.js"),
    import("../../templates/flyer-representative-male-du-front/template.config.js"),
    import("../../templates/flyer-representative-male-sie-front/template.config.js"),
  ]);
  const real = {
    female: { du: fdu.flyerRepresentativeFemaleDuFrontTemplate, sie: fsie.flyerRepresentativeFemaleSieFrontTemplate },
    male: { du: mdu.flyerRepresentativeMaleDuFrontTemplate, sie: msie.flyerRepresentativeMaleSieFrontTemplate },
  };
  assert.equal(
    resolveRepresentativeFlyerFrontTemplate(real, "female", "du").key,
    "FLYER_FRONT_REPRESENTATIVE_FEMALE_DU"
  );
  assert.equal(
    resolveRepresentativeFlyerFrontTemplate(real, "female", "sie").key,
    "FLYER_FRONT_REPRESENTATIVE_FEMALE_SIE"
  );
  assert.equal(
    resolveRepresentativeFlyerFrontTemplate(real, "male", "du").key,
    "FLYER_FRONT_REPRESENTATIVE_MALE_DU"
  );
  assert.equal(
    resolveRepresentativeFlyerFrontTemplate(real, "male", "sie").key,
    "FLYER_FRONT_REPRESENTATIVE_MALE_SIE"
  );

  // alle vier Vorderseiten teilen exakt denselben Feld-/Seiten-Koordinatensatz
  assert.deepEqual(real.female.du.fields, real.male.sie.fields);
  assert.deepEqual(real.female.sie.fields, real.male.du.fields);
  assert.deepEqual(real.female.du.page, real.male.sie.page);
  for (const cfg of [real.female.du, real.female.sie, real.male.du, real.male.sie]) {
    assert.deepEqual(cfg.legacyContentCovers, []);
  }
});
