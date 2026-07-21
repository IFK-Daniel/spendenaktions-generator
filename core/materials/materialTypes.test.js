import { test } from "node:test";
import assert from "node:assert/strict";
import { MATERIAL_TYPE_KEYS, MATERIAL_TYPES, MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";

const EXPECTED_ORDER = [
  "FLYER_DRUCKEREI",
  "FLYER_HOME",
  "QR_PAYPAL_GREEN",
  "QR_PAYPAL_BLACK",
  "QR_GIRO_GREEN",
  "QR_GIRO_BLACK",
];

test("genau sechs Materialtypen sind vorhanden", () => {
  assert.equal(MATERIAL_TYPES.length, 6);
});

test("alle erwarteten Schlüssel sind vorhanden", () => {
  const keys = MATERIAL_TYPES.map((type) => type.key);
  assert.deepEqual(new Set(keys), new Set(EXPECTED_ORDER));
  assert.deepEqual(Object.keys(MATERIAL_TYPE_KEYS).sort(), [...EXPECTED_ORDER].sort());
});

test("Reihenfolge der Materialtypen ist korrekt", () => {
  const keys = MATERIAL_TYPES.map((type) => type.key);
  assert.deepEqual(keys, EXPECTED_ORDER);
});

test("jeder Materialtyp enthält die erwarteten Metadaten", () => {
  const expected = {
    FLYER_DRUCKEREI: { label: "Flyer Druckerei", category: "flyer", format: "pdf", extension: "pdf" },
    FLYER_HOME: { label: "Flyer Home", category: "flyer", format: "pdf", extension: "pdf" },
    QR_PAYPAL_GREEN: { label: "PayPal QR grün", category: "qr", format: "png", extension: "png" },
    QR_PAYPAL_BLACK: { label: "PayPal QR schwarz", category: "qr", format: "png", extension: "png" },
    QR_GIRO_GREEN: { label: "GiroCode grün", category: "qr", format: "png", extension: "png" },
    QR_GIRO_BLACK: { label: "GiroCode schwarz", category: "qr", format: "png", extension: "png" },
  };

  for (const [key, meta] of Object.entries(expected)) {
    const type = MATERIAL_TYPES_BY_KEY[key];
    assert.ok(type, `Materialtyp ${key} sollte existieren`);
    assert.equal(type.key, key);
    assert.equal(type.label, meta.label);
    assert.equal(type.category, meta.category);
    assert.equal(type.format, meta.format);
    assert.equal(type.extension, meta.extension);
  }
});

test("die Definition kann von außen nicht verändert werden", () => {
  assert.throws(() => {
    "use strict";
    MATERIAL_TYPES[0].label = "Manipuliert";
  }, TypeError);

  assert.throws(() => {
    "use strict";
    MATERIAL_TYPES.push({ key: "NEU" });
  }, TypeError);

  assert.throws(() => {
    "use strict";
    MATERIAL_TYPE_KEYS.FLYER_HOME = "MANIPULIERT";
  }, TypeError);

  assert.throws(() => {
    "use strict";
    MATERIAL_TYPES_BY_KEY.FLYER_HOME.label = "Manipuliert";
  }, TypeError);

  assert.equal(MATERIAL_TYPES[0].label, "Flyer Druckerei");
  assert.equal(MATERIAL_TYPES.length, 6);
});
