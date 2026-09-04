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
 * Standard-Ansprache-Variante(n), die ohne bewusste Zusatzauswahl
 * erzeugt werden, sobald ein Flyer-Material gewählt ist — sowohl bei
 * manueller Auswahl als auch im Standard-Starter-Set (siehe
 * `REPRESENTATIVE_STARTER_SET_MATERIAL_KEYS` unten). Wir sind eine
 * Du-Stiftung: Standardfall ist ausschließlich "du"; die Sie-Variante
 * entsteht nur, wenn sie bewusst zusätzlich angefordert wird (UI:
 * Checkbox "Sie-Variante zusätzlich erstellen", siehe
 * `src/intern/generator.js`). Frühere Version dieser Datei erzeugte
 * beide Varianten immer automatisch — das wurde auf ausdrücklichen
 * Wunsch geändert.
 */
export const DEFAULT_FLYER_SALUTATION_VARIANTS = Object.freeze(["du"]);

/**
 * Wie die Urkunde dieser Rolle beim automatisierten Materialversand
 * behandelt wird — zentral hier statt verteilter `if (role === ...)`
 * in `src/intern/generator.js`/`core/materials/buildRepresentativeDeliveryRequest.js`
 * (Vorgabe: "Versandstrategie pro Rolle konfigurierbar machen").
 *
 * - `SEPARATE_EMAIL`: Die Urkunde ist eine persönliche Auszeichnung,
 *   kein Marketingmaterial — sie wird beim automatisierten Versand in
 *   einer EIGENEN, separaten Mail verschickt (nicht zusammen mit
 *   Flyern/QR-Codes im selben ZIP). Aktuell nur `representative`.
 * - `BLOCKED`: Automatisierter Versand dieser Urkunde ist eine
 *   BEWUSSTE, VORLÄUFIGE fachliche Sperre (siehe ausführliche
 *   Begründung bei `ROLE_CONFIG` unten) — Erzeugung, Vorschau und
 *   Download bleiben davon komplett unberührt, nur der automatisierte
 *   Mailversand ist gesperrt. Aktuell alle Rollen außer `representative`.
 * - `WITH_MATERIALS` (noch nicht verwendet): für eine mögliche künftige
 *   Rolle, deren Urkunde zusammen mit den übrigen Materialien in EINER
 *   Mail verschickt werden soll — bewusst als Wert vorbereitet, aber
 *   aktuell von keiner Rolle genutzt und von keiner Funktion
 *   ausgewertet (kein totes Verhalten, nur offene Architektur).
 */
export const CERTIFICATE_DELIVERY_MODES = Object.freeze({
  SEPARATE_EMAIL: "separate_email",
  BLOCKED: "blocked",
  WITH_MATERIALS: "with_materials",
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
 * - `starterSetMaterialKeys` — Materialschlüssel des "Standard-Starter-
 *   Sets" dieser Rolle (Komfort-Vorauswahl für die erstmalige
 *   Ausstattung, siehe `src/intern/generator.js`, "Standard-Starter-Set
 *   auswählen"-Button) — KEIN eigener Materialtyp, nur eine
 *   Vorbelegung der bestehenden Checkboxen (Vorgabe: keine zweite
 *   Erzeugungs-Pipeline). Leer = für diese Rolle (noch) kein
 *   definiertes Starter-Set (aktuell nur `representative` — Botschafter/
 *   Kuratorium/Beirat/Fachrat/Wirtschaftsrat haben noch kein
 *   vollständig definiertes Materialpaket, siehe `hasStarterSet`).
 * - `certificateDeliveryMode` — einer von `CERTIFICATE_DELIVERY_MODES`
 *   (siehe dort). **Wichtig**: Die `BLOCKED`-Einträge unten (alle
 *   Rollen außer `representative`) sind eine BEWUSSTE, VORLÄUFIGE
 *   fachliche Entscheidung, KEINE technische Einschränkung — die
 *   Urkunde dieser Rollen ist weiterhin uneingeschränkt erzeugbar,
 *   als Vorschau zu öffnen und herunterzuladen (siehe
 *   `src/intern/generator.js`, Materialerzeugung bleibt unverändert);
 *   nur der automatisierte Mailversand aus diesem Generator ist
 *   gesperrt, weil für diese Rollen aktuell eine persönlichere
 *   Übergabe/Kommunikation vorgesehen bzw. noch zu klären ist. Später
 *   denkbare, aktuell NICHT implementierte Varianten: persönliche
 *   Übergabe, physisches Starterpaket, individuelle Mail durch
 *   Vorstand/Stiftungsdirektion, automatisierter Versand aus einer
 *   anderen Absenderadresse — diese Konstante ist bewusst so gebaut,
 *   dass eine spätere Entscheidung nur hier (einen Wert je Rolle)
 *   geändert werden muss, ohne Code an anderer Stelle anzufassen.
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
    // Standardfall für die erstmalige Ausstattung eines neuen
    // Repräsentanten: Flyer (Du-Variante, siehe
    // `DEFAULT_FLYER_SALUTATION_VARIANTS`), beide schwarzen QR-Codes,
    // Repräsentantenurkunde. Die Anleitung gehört NICHT hierher — sie
    // ist kein auswählbares Material, sondern automatisches
    // Begleitmaterial jeder Materialerzeugung (siehe
    // `core/materials/staticCompanionMaterialGuide.js`).
    starterSetMaterialKeys: Object.freeze([
      MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI,
      MATERIAL_TYPE_KEYS.FLYER_HOME,
      MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK,
      MATERIAL_TYPE_KEYS.QR_GIRO_BLACK,
      MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE,
    ]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.SEPARATE_EMAIL,
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
    starterSetMaterialKeys: Object.freeze([]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.BLOCKED,
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
    starterSetMaterialKeys: Object.freeze([]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.BLOCKED,
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
    starterSetMaterialKeys: Object.freeze([]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.BLOCKED,
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
    starterSetMaterialKeys: Object.freeze([]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.BLOCKED,
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
    starterSetMaterialKeys: Object.freeze([]),
    certificateDeliveryMode: CERTIFICATE_DELIVERY_MODES.BLOCKED,
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
 * ALLE für den Flyer dieser Rolle grundsätzlich verfügbaren Ansprache-
 * Varianten (z. B. `["du", "sie"]` beim Repräsentanten) — NICHT
 * automatisch alle davon erzeugt (das war das Verhalten vor der
 * Du/Sie-Auswahl, siehe `DEFAULT_FLYER_SALUTATION_VARIANTS`). Dient
 * als (a) Validierungsgrundlage für `buildFlyerVariantEntries.js`
 * (welche Varianten `salutationVariants` dort enthalten darf) und (b)
 * UI-Grundlage, ob eine "Sie-Variante zusätzlich erstellen"-Option
 * überhaupt angezeigt wird (`src/intern/generator.js`). Leeres Array =
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

/**
 * Materialschlüssel des Standard-Starter-Sets dieser Rolle (siehe
 * `ROLE_CONFIG`-Doku, `starterSetMaterialKeys`). Leeres Array = kein
 * Starter-Set für diese Rolle definiert.
 * @param {string} roleKey
 * @returns {string[]}
 */
export function getStarterSetMaterialKeys(roleKey) {
  return getRoleConfig(roleKey).starterSetMaterialKeys;
}

/**
 * Ob diese Rolle ein Standard-Starter-Set hat — steuert, ob der
 * "Standard-Starter-Set auswählen"-Button im Generator für die aktuell
 * gewählte Rolle aktiv/sichtbar ist.
 * @param {string} roleKey
 * @returns {boolean}
 */
export function hasStarterSet(roleKey) {
  return getStarterSetMaterialKeys(roleKey).length > 0;
}

/**
 * Wie die Urkunde dieser Rolle beim automatisierten Versand behandelt
 * wird — einer von `CERTIFICATE_DELIVERY_MODES` (siehe dort für die
 * fachliche Begründung der aktuellen Werte).
 * @param {string} roleKey
 * @returns {string}
 */
export function getCertificateDeliveryMode(roleKey) {
  return getRoleConfig(roleKey).certificateDeliveryMode;
}
