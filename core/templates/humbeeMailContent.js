/**
 * Betreff der Dokumentations-Mail an humbee. Format exakt:
 * "Repräsentant {Bundesland} / {Region} / {Nachname}, {Vorname}" —
 * immer das Wort "Repräsentant", unabhängig vom Geschlecht der Person.
 *
 * @param {object} params
 * @param {string} params.federalState
 * @param {string} params.region
 * @param {string} params.lastName
 * @param {string} params.firstName
 * @returns {string}
 */
export function buildHumbeeMailSubject({ federalState, region, lastName, firstName }) {
  return `Repräsentant ${federalState} / ${region} / ${lastName}, ${firstName}`;
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
