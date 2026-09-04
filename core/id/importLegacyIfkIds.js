import { validateIfkId } from "./validateIfkId.js";

/**
 * Wertet eine Liste bereits vergebener (Alt-)IFK-IDs aus und reserviert
 * jede gültige, in der Eingabe eindeutige ID über die übergebene
 * `reserve`-Funktion. DOM-frei und ohne eigenen DB-Zugriff (siehe
 * `core/id/reserveIfkId.js`) — die eigentliche Speicherung wird per
 * Dependency Injection übergeben, damit dieses Modul unabhängig vom
 * konkreten Speicher (Upstash Redis) unit-testbar bleibt. Genutzt von
 * `scripts/import-ifk-ids.mjs`.
 *
 * Idempotent: Ein erneuter Lauf mit derselben Eingabe liefert für jede
 * ID `alreadyPresent`, sofern `reserve` selbst idempotent ist (Redis
 * `SET ... NX`, siehe `api/_lib/upstashRedis.js`, ist das per
 * Definition) — es entstehen keine Fehler oder doppelten Einträge.
 *
 * @param {string[]} rawLines Rohe Eingabezeilen (z. B. aus einer Datei),
 *   eine IFK-ID pro Zeile. Leerzeilen werden ignoriert.
 * @param {(normalizedId: string) => Promise<boolean>} reserve Reserviert
 *   `normalizedId` atomar und liefert `true`, wenn sie dabei frisch
 *   reserviert wurde (war vorher frei), sonst `false` (war bereits vorhanden).
 * @returns {Promise<{
 *   totalLines: number,
 *   validCount: number,
 *   invalidCount: number,
 *   invalidEntries: Array<{ raw: string, reason: string }>,
 *   uniqueCount: number,
 *   duplicateCount: number,
 *   importedCount: number,
 *   alreadyPresentCount: number,
 *   importedIds: string[],
 *   alreadyPresentIds: string[],
 * }>}
 */
export async function importLegacyIfkIds(rawLines, reserve) {
  const lines = rawLines.map((line) => line.trim()).filter((line) => line.length > 0);

  const invalidEntries = [];
  const seen = new Set();
  const uniqueValidIds = [];

  for (const line of lines) {
    const check = validateIfkId(line);
    if (!check.valid) {
      invalidEntries.push({ raw: line, reason: check.reason });
      continue;
    }
    if (seen.has(check.normalized)) {
      continue;
    }
    seen.add(check.normalized);
    uniqueValidIds.push(check.normalized);
  }

  const importedIds = [];
  const alreadyPresentIds = [];

  for (const id of uniqueValidIds) {
    const wasReserved = await reserve(id);
    if (wasReserved) {
      importedIds.push(id);
    } else {
      alreadyPresentIds.push(id);
    }
  }

  const validCount = lines.length - invalidEntries.length;

  return {
    totalLines: lines.length,
    validCount,
    invalidCount: invalidEntries.length,
    invalidEntries,
    uniqueCount: uniqueValidIds.length,
    duplicateCount: validCount - uniqueValidIds.length,
    importedCount: importedIds.length,
    alreadyPresentCount: alreadyPresentIds.length,
    importedIds,
    alreadyPresentIds,
  };
}
