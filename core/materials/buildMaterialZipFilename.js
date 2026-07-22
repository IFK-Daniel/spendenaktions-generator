import { validateIfkId } from "../id/validateIfkId.js";
import { sanitizeNamePart } from "./buildMaterialFilenames.js";

/**
 * Erzeugt den Dateinamen für das ZIP-Archiv, das ein Repräsentant per
 * Mail erhält: `IFK_Materialien_<IFK-ID>_<Vorname>_<Nachname>.zip`.
 *
 * Nutzt für Vor-/Nachname dieselbe Sanitizing-Logik wie die einzelnen
 * Material-Dateinamen (`buildMaterialFilenames.js`), statt sie zu
 * duplizieren.
 *
 * @param {object} params
 * @param {string} params.ifkId Muss laut `validateIfkId` gültig sein.
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @returns {string}
 * @throws {Error} Bei ungültiger IFK-ID oder fehlendem Vor-/Nachnamen.
 */
export function buildMaterialZipFilename({ ifkId, firstName, lastName } = {}) {
  const ifkIdCheck = validateIfkId(ifkId);
  if (!ifkIdCheck.valid) {
    throw new Error(`buildMaterialZipFilename: ungültige IFK-ID (${ifkIdCheck.reason}).`);
  }

  const sanitizedFirstName = sanitizeNamePart(firstName, "firstName");
  const sanitizedLastName = sanitizeNamePart(lastName, "lastName");

  return `IFK_Materialien_${ifkIdCheck.normalized}_${sanitizedFirstName}_${sanitizedLastName}.zip`;
}
