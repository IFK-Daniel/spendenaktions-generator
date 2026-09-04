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
 * @param {"materials" | "certificate"} [params.kind] Seit der Trennung
 *   von Arbeits-/Marketingmaterialien und persönlicher Urkunde (siehe
 *   `core/materials/buildRepresentativeDeliveryRequest.js`) kann
 *   humbee bis zu zwei getrennte Dokumentations-Mails für dieselbe
 *   Person erhalten — dieser optionale Zusatz macht im Betreff sofort
 *   erkennbar, um welchen Versand es sich handelt (" – Materialversand"
 *   / " – Urkundenversand"). Ohne Angabe (Alt-Verhalten/andere
 *   Aufrufer): Betreff bleibt exakt wie zuvor, ohne Zusatz.
 * @returns {string}
 */
export function buildHumbeeMailSubject({ federalState, region, lastName, firstName, role, kind } = {}) {
  const roleLabel = getRoleLabel(isValidRoleKey(role) ? role : ROLE_KEYS.REPRESENTATIVE, undefined);
  const hasRegion =
    typeof federalState === "string" &&
    federalState.trim() !== "" &&
    typeof region === "string" &&
    region.trim() !== "";

  const base = hasRegion
    ? `${roleLabel} ${federalState} / ${region} / ${lastName}, ${firstName}`
    : `${roleLabel} / ${lastName}, ${firstName}`;

  const suffix = kind === "materials" ? " – Materialversand" : kind === "certificate" ? " – Urkundenversand" : "";
  return `${base}${suffix}`;
}

/**
 * Kurzer technischer Klartext-Hinweis an humbee. Enthält bewusst keine
 * Signatur/Grußformel.
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.ifkId
 * @param {"materials" | "certificate"} [params.kind] Siehe
 *   `buildHumbeeMailSubject`. Ohne Angabe: Text bleibt exakt wie
 *   zuvor ("… wurden personalisierte Materialien erstellt und
 *   versendet.").
 * @returns {string}
 */
export function buildHumbeeMailText({ firstName, lastName, ifkId, kind }) {
  const trimmedIfkId = typeof ifkId === "string" ? ifkId.trim() : "";
  const summary =
    kind === "certificate"
      ? `Für ${firstName} ${lastName} wurde die Urkunde erstellt und versendet.`
      : `Für ${firstName} ${lastName} wurden personalisierte Materialien erstellt und versendet.`;
  return [
    summary,
    // IFK-ID-Zeile nur bei vorhandener ID — nie "IFK-ID: undefined".
    ...(trimmedIfkId ? ["", `IFK-ID: ${trimmedIfkId}`] : []),
  ].join("\n");
}
