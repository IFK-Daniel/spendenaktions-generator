/**
 * Zentrale, unveränderliche Definition der individuellen Materialtypen,
 * die der Materialgenerator-Core aktuell kennt.
 *
 * Bewusst NICHT enthalten (siehe docs/architecture.md): Logos, Corporate
 * Manual, Spendennachweise oder sonstige allgemeine Downloads — der
 * Materialgenerator erzeugt ausschließlich individuelle, personalisierte
 * Materialien für eine Person/IFK-ID.
 *
 * Die grünen QR-Varianten (vormals `QR_PAYPAL_GREEN`/`QR_GIRO_GREEN`)
 * wurden aus dem produktiven Materialworkflow entfernt (Entscheidung:
 * künftig ausschließlich die schwarzen QR-Codes mit grünem
 * It's-for-Kids-Logo). `core/qr/generateQr.js` und `core/config/colors.js`
 * (inkl. `QR_COLOR_GRUEN`) bleiben als wiederverwendbare Core-Bausteine
 * bestehen, erzeugen aber im produktiven Wegbegleiter-Workflow kein
 * grünes QR-Material mehr.
 *
 * Reihenfolge ist bewusst fest und reproduzierbar (siehe
 * `buildMaterialList.js`): Flyer Druckerei, Flyer Home, PayPal QR
 * schwarz, GiroCode schwarz, danach die Urkunden — je Wegbegleiter-Typ
 * genau eine (`core/materials/roleConfig.js`,
 * `certificateMaterialKey`): Repräsentant, Botschafter, Beirat,
 * Kuratorium, Fachrat, Wirtschaftsrat. Repräsentanten- und
 * Botschafter-Urkunde haben je eine männliche/weibliche Vorlagen-
 * Variante DESSELBEN Schlüssels (Auswahl über `gender`, siehe
 * `src/intern/generator.js`); die vier Gremien-Urkunden sind
 * geschlechtsneutral (genau eine Vorlage).
 */

/** Eindeutige technische Schlüssel der Materialtypen. */
export const MATERIAL_TYPE_KEYS = Object.freeze({
  FLYER_DRUCKEREI: "FLYER_DRUCKEREI",
  FLYER_HOME: "FLYER_HOME",
  QR_PAYPAL_BLACK: "QR_PAYPAL_BLACK",
  QR_GIRO_BLACK: "QR_GIRO_BLACK",
  CERTIFICATE_REPRESENTATIVE: "CERTIFICATE_REPRESENTATIVE",
  CERTIFICATE_AMBASSADOR: "CERTIFICATE_AMBASSADOR",
  CERTIFICATE_ADVISORY_BOARD: "CERTIFICATE_ADVISORY_BOARD",
  CERTIFICATE_CURATORIUM: "CERTIFICATE_CURATORIUM",
  CERTIFICATE_EXPERT_COUNCIL: "CERTIFICATE_EXPERT_COUNCIL",
  CERTIFICATE_ECONOMIC_COUNCIL: "CERTIFICATE_ECONOMIC_COUNCIL",
});

/**
 * Die Materialtypen in fester Reihenfolge, jeweils mit
 * `{ key, label, category, format, extension }`. Jedes Objekt sowie das
 * äußere Array sind mit `Object.freeze` eingefroren, damit die
 * Definition von außen nicht versehentlich verändert werden kann.
 *
 * Die `label`-Werte der Urkunden dienen zugleich als sichtbarer Titel
 * der Ergebnis-Karte und der Auswahl-Checkbox (siehe
 * `src/intern/generator.js`) — daher rollenspezifisch statt einheitlich
 * "Urkunde".
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
    key: MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK,
    label: "PayPal QR schwarz",
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
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE,
    label: "Repräsentantenurkunde",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR,
    label: "Botschafterurkunde",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD,
    label: "Urkunde Beirat",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM,
    label: "Urkunde Kuratorium",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL,
    label: "Urkunde Fachrat",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
  Object.freeze({
    key: MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL,
    label: "Urkunde Wirtschaftsrat",
    category: "certificate",
    format: "pdf",
    extension: "pdf",
  }),
]);

/** Nachschlagetabelle Materialtyp-Objekt anhand des Schlüssels, ebenfalls eingefroren. */
export const MATERIAL_TYPES_BY_KEY = Object.freeze(
  Object.fromEntries(MATERIAL_TYPES.map((type) => [type.key, type]))
);

/**
 * Alle Urkunden-Materialschlüssel (`category === "certificate"`), in der
 * festen Reihenfolge aus `MATERIAL_TYPES`. Wird u. a. in
 * `src/intern/generator.js` als `CERTIFICATE_KEYS`-Menge verwendet,
 * damit dort keine einzelnen Urkunden-Schlüssel hart aufgezählt werden.
 */
export const CERTIFICATE_MATERIAL_KEYS = Object.freeze(
  MATERIAL_TYPES.filter((type) => type.category === "certificate").map((type) => type.key)
);
