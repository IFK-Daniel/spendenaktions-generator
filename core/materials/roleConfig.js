import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

/**
 * Zentrale, unveränderliche Definition der unterstützten
 * "Wegbegleiter"-Typen (interne technische Schlüssel). Bewusst stabile,
 * englische Schlüssel — die sichtbaren deutschen Bezeichnungen werden
 * unabhängig davon in `ROLE_CONFIG` gepflegt und können sich ändern,
 * ohne dass gespeicherte/verarbeitete Daten (z. B. `manifest.person.role`)
 * betroffen sind.
 */
export const ROLE_KEYS = Object.freeze({
  REPRESENTATIVE: "representative",
  AMBASSADOR: "ambassador",
  ECONOMIC_COUNCIL: "economic_council",
  EXPERT_COUNCIL: "expert_council",
  CURATOR: "curator",
  ADVISORY_BOARD: "advisory_board",
});

/**
 * Technischer Schlüssel der EINEN gemeinsamen Flyer-Rückseite
 * (`templates/flyer-shared-back/template.config.js`,
 * `SHARED_FLYER_BACK_KEY`). Bewusst rollen-, geschlechts- und
 * ansprache-NEUTRAL benannt: dieselbe Rückseite gilt für den
 * Repräsentanten-Flyer und ist für künftige Wegbegleiter-Flyer
 * (Botschafter, Kuratorium, Beirat, Fachrat, Wirtschaftsrat)
 * vorbereitet — es wird keine Kopie pro Rolle erzeugt. Hier als
 * String-Literal gehalten, damit `core/` nicht von `templates/`
 * abhängt; ein Test stellt die Übereinstimmung mit der Template-Config
 * sicher.
 */
export const SHARED_FLYER_BACK_KEY = "SHARED_FLYER_BACK";

/**
 * Ansprache-Varianten, die für den Repräsentanten-Flyer automatisch
 * BEIDE erzeugt werden (siehe `flyerSalutationVariants` unten) — der
 * Anwender wählt keine Ansprache aus, der Generator iteriert über diese
 * Liste. Als benannte Konstante gehalten, damit sie nicht doppelt als
 * String-Literal in `roleConfig.js` und `generator.js` gepflegt wird.
 */
export const REPRESENTATIVE_FLYER_SALUTATION_VARIANTS = Object.freeze(["du", "sie"]);

/**
 * Rollenbezeichnung für Gremien mit bewusst EINER neutralen Form für
 * alle Geschlechter ("Mitglied des …") statt einer erfundenen
 * männlichen/weiblichen Form (siehe Vorgabe: "keine sprachlich
 * fragwürdigen Formen erfinden").
 */
function neutralRoleLabel(label) {
  return Object.freeze({ male: label, female: label, neutral: label });
}

/**
 * Zentrale, testbare Rollen-Konfiguration — die einzige Stelle, die
 * weiß, welche Stammdaten-Sonderfelder, Vorlagen und Bezeichnungen zu
 * welchem Wegbegleiter-Typ gehören. `src/intern/generator.js` und die
 * Core-Materialfunktionen fragen ausschließlich hier nach, statt
 * rollenspezifische `if`/`else`-Blöcke zu verteilen.
 *
 * Jeder Eintrag:
 * - `key` — technischer Schlüssel (siehe `ROLE_KEYS`).
 * - `label` — sichtbare deutsche Kurzbezeichnung (z. B. für die Auswahl).
 * - `requiresRegion` — ob Bundesland/Region Teil der Datenerfassung sind
 *   (aktuell ausschließlich `representative`).
 * - `roleLabels` — Rollenbezeichnung für Anrede/Mailtexte sowie für das
 *   künftige variable Rollen-Textfeld im Flyer, nach Geschlecht
 *   (`male`/`female`/`neutral`, siehe `getRoleLabel`).
 * - `certificateMaterialKey` — der eine Urkunden-Materialschlüssel
 *   (`materialTypes.js`), der zu dieser Rolle gehört. Jede Rolle hat
 *   genau eine Urkundenvorlage (Repräsentant/Botschafter je nach
 *   Geschlecht zwei Varianten DESSELBEN Schlüssels, siehe
 *   `certificateRequiresGender`).
 * - `certificateRequiresGender` — ob die Urkundenvorlage der Rolle
 *   geschlechtsspezifischen Text enthält und daher Geschlecht zur
 *   Auswahl der Vorlage benötigt (`representative`: männlich/weiblich;
 *   `ambassador`: „zum Botschafter“ / „zur Botschafterin“). Die
 *   Gremien-Urkunden (Beirat/Kuratorium/Fachrat/Wirtschaftsrat) sind
 *   bewusst geschlechtsneutral formuliert → `false`, Geschlecht ist
 *   dort für die Urkunde weder nötig noch Pflicht.
 * - `certificateMaterialKeys` — abgeleitet aus `certificateMaterialKey`
 *   (für `isCertificateTemplateAvailableForRole`); jede Rolle hat eine
 *   Urkundenvorlage, es gibt hier keinen stillen Fallback auf die
 *   Repräsentantenurkunde.
 * - `flyerMaterialKeys` — Materialschlüssel aus `materialTypes.js`, für
 *   die diese Rolle bereits eine Flyer-VORDERSEITE hat. Leer = noch
 *   keine Vorlage hinterlegt (Grafiker erstellt die Master noch), siehe
 *   `isFlyerTemplateAvailableForRole` — KEIN Fallback auf die
 *   Repräsentanten-Flyer.
 * - `flyerBackTemplateKey` — Schlüssel der Flyer-RÜCKSEITE dieser Rolle.
 *   Aktuell für ALLE Rollen die eine gemeinsame, neutrale Rückseite
 *   (`SHARED_FLYER_BACK_KEY`) — hier bereits pro Rolle hinterlegt, damit
 *   künftige Wegbegleiter-Flyer (rollenabhängige Vorderseite + dieselbe
 *   gemeinsame Rückseite) ohne Architekturänderung darauf verweisen
 *   können. Siehe `getFlyerBackTemplateKey`.
 * - `flyerSalutationVariants` — Ansprache-Varianten, die für DIESE
 *   Rolle beim Flyer automatisch ALLE erzeugt werden (kein
 *   Anwender-Auswahlfeld, siehe `src/intern/generator.js`,
 *   `getFlyerSalutationVariants`). `["du", "sie"]` beim Repräsentanten
 *   (zwei Vorderseiten-Vorlagen je Geschlecht); leer bei jeder Rolle
 *   ohne eigene Ansprache-Varianten. Eine künftige Rolle mit eigenen
 *   Du-/Sie-Vorlagen (z. B. Botschafter) muss hier nur diese Liste
 *   sowie ihre Vorderseiten-Vorlagen ergänzen — dieselbe
 *   Iterations-Mechanik in `generator.js` wird automatisch wiederverwendet,
 *   ohne dort verteilte Rollen-Sonderfälle.
 * - `additionalMaterialKeys` — Platzhalter für künftige, rollenspezifische
 *   Zusatzmaterialien (aktuell für alle Rollen leer — es werden bewusst
 *   keine noch nicht existierenden Materialien erfunden).
 */
export const ROLE_CONFIG = Object.freeze({
  [ROLE_KEYS.REPRESENTATIVE]: Object.freeze({
    key: ROLE_KEYS.REPRESENTATIVE,
    label: "Repräsentant",
    requiresRegion: true,
    roleLabels: Object.freeze({ male: "Repräsentant", female: "Repräsentantin", neutral: "Repräsentant" }),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE,
    certificateRequiresGender: true,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE]),
    flyerMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.FLYER_HOME]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: REPRESENTATIVE_FLYER_SALUTATION_VARIANTS,
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.AMBASSADOR]: Object.freeze({
    key: ROLE_KEYS.AMBASSADOR,
    label: "Botschafter",
    requiresRegion: false,
    roleLabels: Object.freeze({ male: "Botschafter", female: "Botschafterin", neutral: "Botschafter" }),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR,
    certificateRequiresGender: true,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR]),
    flyerMaterialKeys: Object.freeze([]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.ECONOMIC_COUNCIL]: Object.freeze({
    key: ROLE_KEYS.ECONOMIC_COUNCIL,
    label: "Wirtschaftsrat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Wirtschaftsrats"),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL,
    certificateRequiresGender: false,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL]),
    flyerMaterialKeys: Object.freeze([]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.EXPERT_COUNCIL]: Object.freeze({
    key: ROLE_KEYS.EXPERT_COUNCIL,
    label: "Fachrat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Fachrats"),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL,
    certificateRequiresGender: false,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL]),
    flyerMaterialKeys: Object.freeze([]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.CURATOR]: Object.freeze({
    key: ROLE_KEYS.CURATOR,
    label: "Kurator",
    requiresRegion: false,
    // Für die künftige Flyer-Rollenbezeichnung ist beim Kuratorium
    // "Kurator"/"Kuratorin" die sinnvollere Form (siehe Vorgabe
    // Abschnitt 10) — die Urkunde selbst ist dagegen geschlechtsneutral
    // ("… ins Kuratorium der Stiftung"), daher `certificateRequiresGender`
    // = false.
    roleLabels: Object.freeze({ male: "Kurator", female: "Kuratorin", neutral: "Kurator" }),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM,
    certificateRequiresGender: false,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM]),
    flyerMaterialKeys: Object.freeze([]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.ADVISORY_BOARD]: Object.freeze({
    key: ROLE_KEYS.ADVISORY_BOARD,
    label: "Beirat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Beirats"),
    certificateMaterialKey: MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD,
    certificateRequiresGender: false,
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD]),
    flyerMaterialKeys: Object.freeze([]),
    flyerBackTemplateKey: SHARED_FLYER_BACK_KEY,
    flyerSalutationVariants: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
});

/** Alle gültigen Rollen-Schlüssel, in der oben definierten Reihenfolge. */
export const ROLE_KEY_LIST = Object.freeze(Object.values(ROLE_KEYS));

export function isValidRoleKey(roleKey) {
  return typeof roleKey === "string" && Object.prototype.hasOwnProperty.call(ROLE_CONFIG, roleKey);
}

/**
 * @param {string} roleKey
 * @returns {object} Der Konfigurationseintrag aus `ROLE_CONFIG`.
 * @throws {Error} Bei unbekanntem `roleKey`.
 */
export function getRoleConfig(roleKey) {
  const config = ROLE_CONFIG[roleKey];
  if (!config) {
    throw new Error(`roleConfig: unbekannter Wegbegleiter-Typ "${roleKey}".`);
  }
  return config;
}

/** Ob Bundesland/Region für diese Rolle Teil der Datenerfassung sind. */
export function roleRequiresRegion(roleKey) {
  return getRoleConfig(roleKey).requiresRegion;
}

/**
 * Rollenbezeichnung für Anrede/Mailtexte und das künftige variable
 * Rollen-Textfeld im Flyer, nach Geschlecht. Gremien liefern für jedes
 * Geschlecht dieselbe neutrale Form (siehe `neutralRoleLabel`).
 * @param {string} roleKey
 * @param {"male" | "female" | undefined} gender
 */
export function getRoleLabel(roleKey, gender) {
  const { roleLabels } = getRoleConfig(roleKey);
  if (gender === "female") return roleLabels.female;
  if (gender === "male") return roleLabels.male;
  return roleLabels.neutral;
}

/**
 * Der Urkunden-Materialschlüssel dieser Rolle (siehe
 * `core/materials/materialTypes.js`). Jede Rolle hat genau einen.
 * @param {string} roleKey
 * @returns {string}
 */
export function getCertificateMaterialKey(roleKey) {
  return getRoleConfig(roleKey).certificateMaterialKey;
}

/**
 * Ob die Urkundenvorlage dieser Rolle geschlechtsspezifischen Text
 * enthält und daher Geschlecht zur Vorlagenauswahl benötigt. `true` nur
 * für `representative` und `ambassador` — die Gremien-Urkunden sind
 * geschlechtsneutral formuliert.
 * @param {string} roleKey
 * @returns {boolean}
 */
export function certificateRequiresGender(roleKey) {
  return getRoleConfig(roleKey).certificateRequiresGender;
}

/** Ob für diese Rolle bereits eine Flyer-Vorderseite für `materialKey` hinterlegt ist. */
export function isFlyerTemplateAvailableForRole(roleKey, materialKey) {
  return getRoleConfig(roleKey).flyerMaterialKeys.includes(materialKey);
}

/**
 * Schlüssel der Flyer-Rückseite dieser Rolle — aktuell für jede Rolle
 * die eine gemeinsame, neutrale Rückseite (`SHARED_FLYER_BACK_KEY`).
 * Eigene Funktion, damit ein späterer rollenspezifischer Rückseiten-
 * Wechsel nur hier passiert, nicht verteilt im Generator.
 * @param {string} roleKey
 * @returns {string}
 */
export function getFlyerBackTemplateKey(roleKey) {
  return getRoleConfig(roleKey).flyerBackTemplateKey;
}

/**
 * Ansprache-Varianten, die für den Flyer dieser Rolle automatisch ALLE
 * erzeugt werden sollen (z. B. `["du", "sie"]` beim Repräsentanten) —
 * kein Anwender-Auswahlfeld, siehe Modul-Doku oben. Leeres Array =
 * diese Rolle hat keine Ansprache-Varianten (aktuell jede Rolle außer
 * Repräsentant, da sie ohnehin noch keine Flyer-Vorlage hat).
 * @param {string} roleKey
 * @returns {string[]}
 */
export function getFlyerSalutationVariants(roleKey) {
  return getRoleConfig(roleKey).flyerSalutationVariants;
}

/** Ob für diese Rolle bereits eine Urkunden-Vorlage für `materialKey` hinterlegt ist. */
export function isCertificateTemplateAvailableForRole(roleKey, materialKey) {
  return getRoleConfig(roleKey).certificateMaterialKeys.includes(materialKey);
}
