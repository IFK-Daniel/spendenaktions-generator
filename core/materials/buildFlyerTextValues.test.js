import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlyerTextValues } from "./buildFlyerTextValues.js";

test("baut Name aus Vor-/Nachname und übernimmt Telefon/E-Mail", () => {
  const values = buildFlyerTextValues(
    { firstName: "Kim", lastName: "Yu", phone: "0170 1234567", email: "kim.yu@example.com" },
    {}
  );
  assert.equal(values.name, "Kim Yu");
  assert.equal(values.phone, "0170 1234567");
  assert.equal(values.email, "kim.yu@example.com");
});

test("region ohne regionPrefix bleibt der bloße Regionsname", () => {
  const values = buildFlyerTextValues({ firstName: "Kim", lastName: "Yu", region: "Wien" }, {});
  assert.equal(values.region, "Wien");
  assert.equal(values.regionInParagraph, "Wien");
});

test("region MIT fields.region.regionPrefix rendert den vollen Satz, regionInParagraph bleibt der bloße Name", () => {
  const values = buildFlyerTextValues(
    { firstName: "Kim", lastName: "Yu", region: "Wien" },
    { fields: { region: { regionPrefix: "für die Region " } } }
  );
  assert.equal(values.region, "für die Region Wien");
  assert.equal(values.regionInParagraph, "Wien");
});

test("fehlende Region bleibt leer, auch mit regionPrefix (kein 'für die Region ' ohne Namen)", () => {
  const values = buildFlyerTextValues(
    { firstName: "Kim", lastName: "Yu" },
    { fields: { region: { regionPrefix: "für die Region " } } }
  );
  assert.equal(values.region, "");
});

test("fehlende optionale Felder werden zu leeren Strings, kein 'undefined'", () => {
  const values = buildFlyerTextValues({ firstName: "Kim", lastName: "Yu" }, {});
  assert.equal(values.phone, "");
  assert.equal(values.email, "");
  assert.equal(values.region, "");
});
