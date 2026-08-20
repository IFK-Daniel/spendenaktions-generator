import { validateIfkId } from "../id/validateIfkId.js";
import { sanitizeNamePart } from "./buildMaterialFilenames.js";

/**
 * Erzeugt den Dateinamen für das ZIP-Archiv, das ein Repräsentant per
 * Mail erhält: `IFK_Materialien_<IFK-ID>_<Vorname>_<Nachname>.zip`.
 *
 * Die IFK-ID ist optional: enthält das Manifest ausschließlich
 * Materialien ohne fachlichen IFK-ID-Bedarf (siehe
 * `core/materials/materialRequirements.js`, z. B. eine allein versendete
 * Urkunde), bleibt `person.ifkId` bereits in `buildMaterialManifest()`
 * leer — der Zip-Dateiname lässt das ID-Segment dann analog zum
 * Urkunden-Dateischema (`Urkunde_<Vorname>_<Nachname>.pdf`, siehe
 * `buildMaterialFilenames.js`) ebenfalls weg, statt den Versand mit
 * einer fachlich nicht benötigten Angabe zu blockieren (Vorgabe
 * Abschnitt 7).
 *
 * Nutzt für Vor-/Nachname dieselbe Sanitizing-Logik wie die einzelnen
 * Material-Dateinamen (`buildMaterialFilenames.js`), statt sie zu
 * duplizieren.
 *
 * @param {object} params
 * @param {string} [params.ifkId] Sofern angegeben, muss sie laut
 *   `validateIfkId` gültig sein.
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @returns {string}
 * @throws {Error} Bei angegebener, aber ungültiger IFK-ID oder
 *   fehlendem Vor-/Nachnamen.
 */
export function buildMaterialZipFilename({ ifkId, firstName, lastName } = {}) {
  const sanitizedFirstName = sanitizeNamePart(firstName, "firstName");
  const sanitizedLastName = sanitizeNamePart(lastName, "lastName");

  if (ifkId === undefined) {
    return `IFK_Materialien_${sanitizedFirstName}_${sanitizedLastName}.zip`;
  }

  const ifkIdCheck = validateIfkId(ifkId);
  if (!ifkIdCheck.valid) {
    throw new Error(`buildMaterialZipFilename: ungültige IFK-ID (${ifkIdCheck.reason}).`);
  }

  return `IFK_Materialien_${ifkIdCheck.normalized}_${sanitizedFirstName}_${sanitizedLastName}.zip`;
}
