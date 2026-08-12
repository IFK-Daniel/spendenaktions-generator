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
 * - `roleLabels` — Rollenbezeichnung für Anrede/Mailtexte, nach
 *   Geschlecht (`male`/`female`/`neutral`, siehe `getRoleLabel`).
 * - `flyerMaterialKeys` — Materialschlüssel aus `materialTypes.js`, für
 *   die diese Rolle bereits eine Flyer-Vorlage hat. Leer = noch keine
 *   Vorlage hinterlegt, siehe `isFlyerTemplateAvailableForRole`.
 * - `certificateMaterialKeys` — analog für Urkunden-Vorlagen.
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
    flyerMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.FLYER_HOME]),
    certificateMaterialKeys: Object.freeze([MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.AMBASSADOR]: Object.freeze({
    key: ROLE_KEYS.AMBASSADOR,
    label: "Botschafter",
    requiresRegion: false,
    roleLabels: Object.freeze({ male: "Botschafter", female: "Botschafterin", neutral: "Botschafter" }),
    flyerMaterialKeys: Object.freeze([]),
    certificateMaterialKeys: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.ECONOMIC_COUNCIL]: Object.freeze({
    key: ROLE_KEYS.ECONOMIC_COUNCIL,
    label: "Wirtschaftsrat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Wirtschaftsrats"),
    flyerMaterialKeys: Object.freeze([]),
    certificateMaterialKeys: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.EXPERT_COUNCIL]: Object.freeze({
    key: ROLE_KEYS.EXPERT_COUNCIL,
    label: "Fachrat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Fachrats"),
    flyerMaterialKeys: Object.freeze([]),
    certificateMaterialKeys: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.CURATOR]: Object.freeze({
    key: ROLE_KEYS.CURATOR,
    label: "Kurator",
    requiresRegion: false,
    roleLabels: Object.freeze({ male: "Kurator", female: "Kuratorin", neutral: "Kurator" }),
    flyerMaterialKeys: Object.freeze([]),
    certificateMaterialKeys: Object.freeze([]),
    additionalMaterialKeys: Object.freeze([]),
  }),
  [ROLE_KEYS.ADVISORY_BOARD]: Object.freeze({
    key: ROLE_KEYS.ADVISORY_BOARD,
    label: "Beirat",
    requiresRegion: false,
    roleLabels: neutralRoleLabel("Mitglied des Beirats"),
    flyerMaterialKeys: Object.freeze([]),
    certificateMaterialKeys: Object.freeze([]),
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
 * Rollenbezeichnung für Anrede/Mailtexte, nach Geschlecht. Gremien
 * liefern für jedes Geschlecht dieselbe neutrale Form (siehe
 * `neutralRoleLabel`).
 * @param {string} roleKey
 * @param {"male" | "female" | undefined} gender
 */
export function getRoleLabel(roleKey, gender) {
  const { roleLabels } = getRoleConfig(roleKey);
  if (gender === "female") return roleLabels.female;
  if (gender === "male") return roleLabels.male;
  return roleLabels.neutral;
}

/** Ob für diese Rolle bereits eine Flyer-Vorlage für `materialKey` hinterlegt ist. */
export function isFlyerTemplateAvailableForRole(roleKey, materialKey) {
  return getRoleConfig(roleKey).flyerMaterialKeys.includes(materialKey);
}

/** Ob für diese Rolle bereits eine Urkunden-Vorlage für `materialKey` hinterlegt ist. */
export function isCertificateTemplateAvailableForRole(roleKey, materialKey) {
  return getRoleConfig(roleKey).certificateMaterialKeys.includes(materialKey);
}
