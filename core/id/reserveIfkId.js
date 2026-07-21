/**
 * Reserviert eine IFK-ID serverseitig, um Mehrfachvergabe/Kollisionen
 * zwischen gleichzeitigen Aktionen/Repräsentanten zu verhindern.
 *
 * Geplante Verantwortlichkeit: Kommunikation mit einem noch zu
 * definierenden Backend-Endpunkt (analog zu
 * `core/mail/sendGeneratedMaterials.js`), der eine gemäß
 * `generateIfkId`/`validateIfkId` formal gültige ID als "vergeben"
 * markiert. Enthält keine eigene Speicherlogik – die Persistenz liegt
 * außerhalb dieses Moduls (kein DB-Zugriff im Core). Dieses Modul bleibt
 * bewusst vollständig unabhängig von einer konkreten Datenbank: Es
 * kennt nur den künftigen API-Vertrag, nicht dessen Implementierung.
 *
 * Geplanter Datenfluss: Client ruft `generateIfkId()` → Client prüft
 * das Ergebnis optional mit `validateIfkId()` → Client ruft
 * `reserveIfkId(id)` → Server prüft/reserviert die ID gegen eine
 * Datenquelle → Rückmeldung an den Client.
 *
 * Abhängigkeiten (geplant): künftiger API-Endpunkt (`/api/...`, noch
 * nicht angelegt); die aufrufende Seite sollte die ID vorab mit
 * `validateIfkId` prüfen, um offensichtlich ungültige IDs erst gar
 * nicht zu reservieren.
 *
 * TODO: API-Endpunkt für die Reservierung definieren und implementieren.
 * TODO: Fehlerfälle klären (ID bereits vergeben, Endpunkt nicht erreichbar).
 *
 * @param {string} ifkId Eine gemäß `validateIfkId` formal gültige IFK-ID.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function reserveIfkId(ifkId) {
  throw new Error("reserveIfkId: noch nicht implementiert");
}
