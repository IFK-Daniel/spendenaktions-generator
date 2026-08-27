import { MATERIAL_TYPE_KEYS, MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";
import { getRoleConfig, isValidRoleKey } from "./roleConfig.js";

/**
 * Zentrale, DOM-freie und testbare Definition, welche Personendaten für
 * welchen Materialtyp tatsächlich fachlich benötigt werden (siehe
 * docs/architecture.md, Abschnitt "Materialabhängige
 * Datenanforderungen").
 *
 * Ersetzt eine frühere globale Pflichtfeldliste in `src/intern/
 * generator.js` — dort wird ausschließlich diese Konfiguration
 * abgefragt, keine verteilten materialspezifischen `if`/`else`-Blöcke
 * mehr. Die Renderer (Flyer/Urkunde/QR) selbst bleiben unverändert und
 * kennen weiterhin keine Pflichtfeldlogik.
 */

/** Eindeutige Schlüssel der Personendatenfelder, die von Materialien benötigt werden können. */
export const FIELD_KEYS = Object.freeze({
  FIRST_NAME: "firstName",
  LAST_NAME: "lastName",
  GENDER: "gender",
  IFK_ID: "ifkId",
  EMAIL: "email",
  PHONE: "phone",
  FEDERAL_STATE: "federalState",
  REGION: "region",
  PHOTO_URL: "photoUrl",
  PAYPAL_URL: "paypalUrl",
});

/**
 * Feste Anzeigereihenfolge der Felder — entspricht der Reihenfolge im
 * Formular (`intern/index.html`) und wird für Fehlermeldungen und die
 * Vereinigungsmenge mehrerer Materialien verwendet.
 */
export const FIELD_ORDER = Object.freeze([
  FIELD_KEYS.FIRST_NAME,
  FIELD_KEYS.LAST_NAME,
  FIELD_KEYS.GENDER,
  FIELD_KEYS.IFK_ID,
  FIELD_KEYS.EMAIL,
  FIELD_KEYS.PHONE,
  FIELD_KEYS.FEDERAL_STATE,
  FIELD_KEYS.REGION,
  FIELD_KEYS.PHOTO_URL,
  FIELD_KEYS.PAYPAL_URL,
]);

/** Sichtbare deutsche Bezeichnung je Feld, für Pflichtfeld-Hinweise und Fehlermeldungen. */
export const FIELD_LABELS = Object.freeze({
  [FIELD_KEYS.FIRST_NAME]: "Vorname",
  [FIELD_KEYS.LAST_NAME]: "Nachname",
  [FIELD_KEYS.GENDER]: "Geschlecht",
  [FIELD_KEYS.IFK_ID]: "IFK-ID",
  [FIELD_KEYS.EMAIL]: "E-Mail-Adresse",
  [FIELD_KEYS.PHONE]: "Telefonnummer",
  [FIELD_KEYS.FEDERAL_STATE]: "Bundesland",
  [FIELD_KEYS.REGION]: "Region",
  [FIELD_KEYS.PHOTO_URL]: "Foto-Link",
  [FIELD_KEYS.PAYPAL_URL]: "PayPal-Link",
});

/**
 * Rollenunabhängige Basisanforderungen je Materialtyp.
 *
 * - Urkunde: nur Vorname, Nachname, Geschlecht (Vorlagenauswahl) — kein
 *   Foto, keine IFK-ID, kein PayPal-Link, keine Kontaktdaten.
 * - PayPal-QR schwarz: nur Vorname/Nachname (Dateiname/Personalisierung)
 *   und der PayPal-Link selbst — die IFK-ID ist NICHT Bestandteil des
 *   QR-Inhalts (siehe `core/materials/generateQrMaterials.js`,
 *   `content: validatedPaypalUrl`) und daher fachlich nicht nötig.
 * - GiroCode schwarz: Vorname/Nachname und die IFK-ID, die tatsächlich
 *   Teil des QR-Inhalts ist (Verwendungszweck, siehe
 *   `generateQrMaterials.js`, `buildGirocodeContent()`). Empfänger/IBAN/
 *   BIC sind bereits statisch in `core/config/girocodeDefaults.js`
 *   hinterlegt und daher kein Formularfeld.
 * - Flyer: benötigt vollständige Daten (siehe Vorgabe) — beide
 *   schwarzen QR-Codes werden für den Flyer eingebettet, daher auch
 *   IFK-ID und PayPal-Link.
 */
const BASE_MATERIAL_REQUIREMENTS = Object.freeze({
  [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
    FIELD_KEYS.EMAIL,
    FIELD_KEYS.PHONE,
    FIELD_KEYS.IFK_ID,
    FIELD_KEYS.PHOTO_URL,
    FIELD_KEYS.PAYPAL_URL,
  ]),
  [MATERIAL_TYPE_KEYS.FLYER_HOME]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
    FIELD_KEYS.EMAIL,
    FIELD_KEYS.PHONE,
    FIELD_KEYS.IFK_ID,
    FIELD_KEYS.PHOTO_URL,
    FIELD_KEYS.PAYPAL_URL,
  ]),
  [MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.PAYPAL_URL,
  ]),
  [MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.IFK_ID,
  ]),
  // Repräsentanten- und Botschafter-Urkunde enthalten geschlechts-
  // spezifischen Text (männlich/weiblich bzw. „zum Botschafter“ / „zur
  // Botschafterin“) — daher ist Geschlecht für die Vorlagenauswahl
  // Pflicht.
  [MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
  ]),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
    FIELD_KEYS.GENDER,
  ]),
  // Beirat/Kuratorium/Fachrat/Wirtschaftsrat: die Vorlagen sind bewusst
  // geschlechtsneutral formuliert („Hiermit berufen wir [Name] in den
  // Beirat / ins Kuratorium der Stiftung“) — es gibt je genau EINE
  // Vorlage, Geschlecht wird für die Erzeugung nicht benötigt und darf
  // daher nicht Pflicht sein.
  [MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
  ]),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
  ]),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
  ]),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL]: Object.freeze([
    FIELD_KEYS.FIRST_NAME,
    FIELD_KEYS.LAST_NAME,
  ]),
});

/**
 * Materialtypen, für die Bundesland/Region zusätzlich benötigt werden,
 * sofern die aktuelle Rolle sie verlangt (`roleConfig.js`,
 * `requiresRegion`) — aktuell ausschließlich die beiden Flyer-Varianten.
 * Für die Urkunde bleibt Region unabhängig von der Rolle nicht
 * erforderlich, solange das jeweilige Urkundentemplate keine Region
 * verwendet (siehe `generateCertificateMaterial.js`).
 */
const MATERIALS_WITH_ROLE_DEPENDENT_REGION = new Set([
  MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI,
  MATERIAL_TYPE_KEYS.FLYER_HOME,
]);

function assertKnownMaterial(materialKey) {
  if (!MATERIAL_TYPES_BY_KEY[materialKey]) {
    throw new Error(`materialRequirements: unbekannter Materialtyp "${materialKey}".`);
  }
}

/**
 * Liefert die benötigten Feldschlüssel für genau einen Materialtyp, in
 * fester Reihenfolge (`FIELD_ORDER`).
 *
 * @param {string} materialKey Schlüssel aus `MATERIAL_TYPE_KEYS`.
 * @param {string} [roleKey] Optional. Wegbegleiter-Typ aus
 *   `core/materials/roleConfig.js` — steuert nur, ob Bundesland/Region
 *   für Flyer-Materialien zusätzlich benötigt werden (siehe
 *   `roleRequiresRegion`). Ohne Angabe oder bei unbekannter Rolle wird
 *   Region nicht als benötigt gewertet.
 * @returns {string[]}
 */
export function getRequiredFieldsForMaterial(materialKey, roleKey) {
  assertKnownMaterial(materialKey);
  const base = BASE_MATERIAL_REQUIREMENTS[materialKey];

  const needsRegion =
    MATERIALS_WITH_ROLE_DEPENDENT_REGION.has(materialKey) &&
    typeof roleKey === "string" &&
    isValidRoleKey(roleKey) &&
    getRoleConfig(roleKey).requiresRegion;

  if (!needsRegion) {
    return [...base];
  }

  const withRegion = new Set([...base, FIELD_KEYS.FEDERAL_STATE, FIELD_KEYS.REGION]);
  return FIELD_ORDER.filter((key) => withRegion.has(key));
}

/**
 * Vereinigungsmenge der benötigten Felder über mehrere gleichzeitig
 * ausgewählte Materialien hinweg — keine Duplikate, feste Reihenfolge.
 *
 * @param {string[]} materialKeys
 * @param {string} [roleKey] Siehe `getRequiredFieldsForMaterial`.
 * @returns {string[]}
 */
export function getRequiredFieldsForMaterials(materialKeys, roleKey) {
  const union = new Set();
  for (const materialKey of materialKeys || []) {
    for (const field of getRequiredFieldsForMaterial(materialKey, roleKey)) {
      union.add(field);
    }
  }
  return FIELD_ORDER.filter((key) => union.has(key));
}

function isFieldValuePresent(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

/**
 * Rein wertbasierte (oberflächliche) Prüfung, welche der übergebenen
 * Feldschlüssel in `values` fehlen (leer/undefiniert) — keine
 * Formatprüfung (z. B. gültige IFK-ID, gültige E-Mail); diese bleibt
 * bei den bestehenden, spezialisierten Validierungen
 * (`core/id/validateIfkId.js`, `core/mail/validateEmail.js`, …).
 *
 * @param {string[]} requiredFieldKeys
 * @param {Record<string, unknown>} values
 * @returns {string[]} Teilmenge von `requiredFieldKeys`, in unveränderter Reihenfolge.
 */
export function getMissingFields(requiredFieldKeys, values) {
  return requiredFieldKeys.filter((key) => !isFieldValuePresent(values?.[key]));
}
