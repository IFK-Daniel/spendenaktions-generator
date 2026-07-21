/**
 * Zentrale, unveränderliche Definition der individuellen Materialtypen,
 * die der Materialgenerator-Core aktuell kennt.
 *
 * Bewusst NICHT enthalten (siehe docs/architecture.md): Logos, Corporate
 * Manual, Spendennachweise oder sonstige allgemeine Downloads — der
 * Materialgenerator erzeugt ausschließlich individuelle, personalisierte
 * Materialien für eine Person/IFK-ID.
 *
 * Reihenfolge ist bewusst fest und reproduzierbar (siehe
 * `buildMaterialList.js`): Flyer Druckerei, Flyer Home, PayPal QR grün,
 * PayPal QR schwarz, GiroCode grün, GiroCode schwarz.
 */

/** Eindeutige technische Schlüssel der sechs Materialtypen. */
export const MATERIAL_TYPE_KEYS = Object.freeze({
  FLYER_DRUCKEREI: "FLYER_DRUCKEREI",
  FLYER_HOME: "FLYER_HOME",
  QR_PAYPAL_GREEN: "QR_PAYPAL_GREEN",
  QR_PAYPAL_BLACK: "QR_PAYPAL_BLACK",
  QR_GIRO_GREEN: "QR_GIRO_GREEN",
  QR_GIRO_BLACK: "QR_GIRO_BLACK",
});

/**
 * Die sechs Materialtypen in fester Reihenfolge, jeweils mit
 * `{ key, label, category, format, extension }`. Jedes Objekt sowie das
 * äußere Array sind mit `Object.freeze` eingefroren, damit die
 * Definition von außen nicht versehentlich verändert werden kann.
 */
export const MATERIAL_TYPES = Object.freeze([
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI,
    label: "Flyer Druckerei",
    category: "flyer",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.FLYER_HOME,
    label: "Flyer Home",
    category: "flyer",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN,
    label: "PayPal QR grün",
    category: "qr",
    format: "png",
    extension: "png",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK,
    label: "PayPal QR schwarz",
    category: "qr",
    format: "png",
    extension: "png",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.QR_GIRO_GREEN,
    label: "GiroCode grün",
    category: "qr",
    format: "png",
    extension: "png",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.QR_GIRO_BLACK,
    label: "GiroCode schwarz",
    category: "qr",
    format: "png",
    extension: "png",
  }),
]);

/** Nachschlagetabelle Materialtyp-Objekt anhand des Schlüssels, ebenfalls eingefroren. */
export const MATERIAL_TYPES_BY_KEY = Object.freeze(
  Object.fromEntries(MATERIAL_TYPES.map((type) => [type.key, type]))
);
