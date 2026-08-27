import { ROLE_KEYS, getRoleLabel, isValidRoleKey } from "../materials/roleConfig.js";

/**
 * Betreff der Dokumentations-Mail an humbee.
 *
 * - Repräsentant (mit Bundesland/Region): unverändert
 *   "Repräsentant {Bundesland} / {Region} / {Nachname}, {Vorname}".
 * - Andere Wegbegleiter (kein Bundesland/keine Region): "{Rolle} /
 *   {Nachname}, {Vorname}" mit der neutralen Rollenbezeichnung aus
 *   `core/materials/roleConfig.js` (z. B. "Botschafter", "Mitglied des
 *   Beirats") — bewusst KEINE falsche "Repräsentant"-Kennzeichnung als
 *   Fallback.
 *
 * Das Geschlecht fließt bewusst NICHT ein (interne Dokumentations-Mail,
 * kein Anschreiben) — für Repräsentant/Botschafter wird dadurch die
 * neutrale Form verwendet ("Repräsentant"/"Botschafter"), wie bisher.
 *
 * @param {object} params
 * @param {string} [params.federalState]
 * @param {string} [params.region]
 * @param {string} params.lastName
 * @param {string} params.firstName
 * @param {string} [params.role] Technischer Rollen-Schlüssel
 *   (`manifest.person.role`). Ohne Angabe: `representative`.
 * @returns {string}
 */
export function buildHumbeeMailSubject({ federalState, region, lastName, firstName, role } = {}) {
  const roleLabel = getRoleLabel(isValidRoleKey(role) ? role : ROLE_KEYS.REPRESENTATIVE, undefined);
  const hasRegion =
    typeof federalState === "string" &&
    federalState.trim() !== "" &&
    typeof region === "string" &&
    region.trim() !== "";

  return hasRegion
    ? `${roleLabel} ${federalState} / ${region} / ${lastName}, ${firstName}`
    : `${roleLabel} / ${lastName}, ${firstName}`;
}

/**
 * Kurzer technischer Klartext-Hinweis an humbee. Enthält bewusst keine
 * Signatur/Grußformel.
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.ifkId
 * @returns {string}
 */
export function buildHumbeeMailText({ firstName, lastName, ifkId }) {
  return [
    `Für ${firstName} ${lastName} wurden personalisierte Materialien erstellt und versendet.`,
    "",
    `IFK-ID: ${ifkId}`,
  ].join("\n");
}
