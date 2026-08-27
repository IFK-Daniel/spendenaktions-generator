import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MATERIAL_TYPE_KEYS,
  MATERIAL_TYPES,
  MATERIAL_TYPES_BY_KEY,
  CERTIFICATE_MATERIAL_KEYS,
} from "./materialTypes.js";

const EXPECTED_ORDER = [
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

test("genau zehn Materialtypen sind vorhanden (2 Flyer, 2 QR, 6 Urkunden — grüne QR-Varianten entfernt)", () => {
  assert.equal(MATERIAL_TYPES.length, 10);
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
    QR_PAYPAL_BLACK: { label: "PayPal QR schwarz", category: "qr", format: "png", extension: "png" },
    QR_GIRO_BLACK: { label: "GiroCode schwarz", category: "qr", format: "png", extension: "png" },
    CERTIFICATE_REPRESENTATIVE: {
      label: "Repräsentantenurkunde",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
    CERTIFICATE_AMBASSADOR: {
      label: "Botschafterurkunde",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
    CERTIFICATE_ADVISORY_BOARD: {
      label: "Urkunde Beirat",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
    CERTIFICATE_CURATORIUM: {
      label: "Urkunde Kuratorium",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
    CERTIFICATE_EXPERT_COUNCIL: {
      label: "Urkunde Fachrat",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
    CERTIFICATE_ECONOMIC_COUNCIL: {
      label: "Urkunde Wirtschaftsrat",
      category: "certificate",
      format: "pdf",
      extension: "pdf",
    },
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

test("CERTIFICATE_MATERIAL_KEYS listet genau die sechs Urkunden-Schlüssel in fester Reihenfolge", () => {
  assert.deepEqual(CERTIFICATE_MATERIAL_KEYS, [
    "CERTIFICATE_REPRESENTATIVE",
    "CERTIFICATE_AMBASSADOR",
    "CERTIFICATE_ADVISORY_BOARD",
    "CERTIFICATE_CURATORIUM",
    "CERTIFICATE_EXPERT_COUNCIL",
    "CERTIFICATE_ECONOMIC_COUNCIL",
  ]);
  for (const key of CERTIFICATE_MATERIAL_KEYS) {
    assert.equal(MATERIAL_TYPES_BY_KEY[key].category, "certificate");
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
  assert.equal(MATERIAL_TYPES.length, 10);
});
