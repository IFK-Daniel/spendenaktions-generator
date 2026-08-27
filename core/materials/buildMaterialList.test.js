import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMaterialList } from "./buildMaterialList.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

const ALL_KEYS_IN_ORDER = [
  "FLYER_DRUCKEREI",
  "FLYER_HOME",
  "QR_PAYPAL_BLACK",
  "QR_GIRO_BLACK",
  "CERTIFICATE_REPRESENTATIVE",
  "CERTIFICATE_AMBASSADOR",
  "CERTIFICATE_ADVISORY_BOARD",
  "CERTIFICATE_CURATORIUM",
  "CERTIFICATE_EXPERT_COUNCIL",
  "CERTIFICATE_ECONOMIC_COUNCIL",
];

function keysOf(list) {
  return list.map((type) => type.key);
}

test("ohne Optionen werden alle zehn Materialien geliefert", () => {
  const result = buildMaterialList();
  assert.deepEqual(keysOf(result), ALL_KEYS_IN_ORDER);
});

test("ohne Argument (undefined) werden ebenfalls alle zehn geliefert", () => {
  const result = buildMaterialList(undefined);
  assert.deepEqual(keysOf(result), ALL_KEYS_IN_ORDER);
});

test("include liefert nur die angegebenen Materialien", () => {
  const result = buildMaterialList({
    include: [MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK, MATERIAL_TYPE_KEYS.FLYER_HOME],
  });
  assert.deepEqual(keysOf(result), ["FLYER_HOME", "QR_PAYPAL_BLACK"]);
});

test("exclude entfernt Materialien aus der Auswahl", () => {
  const result = buildMaterialList({
    exclude: [MATERIAL_TYPE_KEYS.QR_GIRO_BLACK],
  });
  assert.deepEqual(keysOf(result), [
    "FLYER_DRUCKEREI",
    "FLYER_HOME",
    "QR_PAYPAL_BLACK",
    "CERTIFICATE_REPRESENTATIVE",
    "CERTIFICATE_AMBASSADOR",
    "CERTIFICATE_ADVISORY_BOARD",
    "CERTIFICATE_CURATORIUM",
    "CERTIFICATE_EXPERT_COUNCIL",
    "CERTIFICATE_ECONOMIC_COUNCIL",
  ]);
});

test("include und exclude gemeinsam schränken die Auswahl weiter ein", () => {
  const result = buildMaterialList({
    include: [MATERIAL_TYPE_KEYS.FLYER_HOME, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK],
    exclude: [MATERIAL_TYPE_KEYS.QR_GIRO_BLACK],
  });
  assert.deepEqual(keysOf(result), ["FLYER_HOME", "QR_PAYPAL_BLACK"]);
});

test("keine Duplikate, auch wenn include Schlüssel doppelt enthält", () => {
  const result = buildMaterialList({
    include: [MATERIAL_TYPE_KEYS.FLYER_HOME, MATERIAL_TYPE_KEYS.FLYER_HOME],
  });
  assert.deepEqual(keysOf(result), ["FLYER_HOME"]);
});

test("unbekannter Typ in include erzeugt einen Fehler", () => {
  assert.throws(() => buildMaterialList({ include: ["NICHT_VORHANDEN"] }), /unbekannter Materialtyp/);
});

test("unbekannter Typ in exclude erzeugt einen Fehler", () => {
  assert.throws(() => buildMaterialList({ exclude: ["NICHT_VORHANDEN"] }), /unbekannter Materialtyp/);
});

test("grüne QR-Varianten sind keine bekannten Materialtypen mehr", () => {
  assert.throws(() => buildMaterialList({ include: ["QR_PAYPAL_GREEN"] }), /unbekannter Materialtyp/);
  assert.throws(() => buildMaterialList({ include: ["QR_GIRO_GREEN"] }), /unbekannter Materialtyp/);
});

test("include/exclude als Nicht-Array erzeugt einen Fehler", () => {
  assert.throws(() => buildMaterialList({ include: "FLYER_HOME" }), /Array/);
  assert.throws(() => buildMaterialList({ exclude: "FLYER_HOME" }), /Array/);
});

test("die feste Reihenfolge bleibt auch bei anders sortierter include-Liste erhalten", () => {
  const result = buildMaterialList({
    include: [MATERIAL_TYPE_KEYS.QR_GIRO_BLACK, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK],
  });
  assert.deepEqual(keysOf(result), ["FLYER_DRUCKEREI", "QR_PAYPAL_BLACK", "QR_GIRO_BLACK"]);
});
