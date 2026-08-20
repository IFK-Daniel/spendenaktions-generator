import { isValidEmail } from "../mail/validateEmail.js";
import { isHttpUrl } from "../text/isHttpUrl.js";
import { MATERIAL_TYPES_BY_KEY } from "./materialTypes.js";
import { buildMaterialFilenames } from "./buildMaterialFilenames.js";
import { isValidRoleKey } from "./roleConfig.js";

/**
 * Zulässige Werte für `gender`. Bewusst auf genau zwei Werte begrenzt,
 * kein Freitext — dient als Vorbereitung für die spätere
 * Flyer-Generierung (Repräsentant/Repräsentantin usw.), wird aktuell
 * von keiner Funktion ausgewertet.
 */
export const GENDER_VALUES = Object.freeze({
  MALE: "male",
  FEMALE: "female",
});

const VALID_GENDER_VALUES = new Set(Object.values(GENDER_VALUES));

/**
 * Baut aus Materialauswahl und Dateinamen ein vollständiges, rein
 * fachliches Manifest der für eine Person zu erzeugenden individuellen
 * Materialien.
 *
 * Enthält bewusst ausschließlich die Beschreibung, WAS erzeugt werden
 * soll (Schlüssel, Bezeichnung, Kategorie, Format, Dateiname) — keine
 * Dateiinhalte, Blob-Daten, URLs, Mail- oder ZIP-Daten. Die eigentliche
 * Erzeugung, Bündelung und der Versand sind bewusst nicht Teil dieses
 * Moduls (siehe `core/qr`, `core/zip`, `core/mail`).
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} [params.ifkId] Pflicht, sofern mindestens einer der
 *   ausgewählten Materialtypen die IFK-ID fachlich benötigt (siehe
 *   `core/materials/materialRequirements.js`, z. B. GiroCode schwarz
 *   oder Flyer). Andernfalls (z. B. ausschließlich die Repräsentanten-
 *   urkunde oder ausschließlich PayPal QR schwarz ausgewählt) optional —
 *   `person` enthält dann kein `ifkId`-Feld, eine fehlende oder
 *   ungültige IFK-ID blockiert die Erzeugung nicht.
 * @param {string} [params.role] Optional. Technischer Wegbegleiter-Typ-
 *   Schlüssel (siehe `core/materials/roleConfig.js`, `ROLE_KEYS`). Wird,
 *   sofern angegeben, gegen die zentrale Rollen-Konfiguration geprüft
 *   und unverändert im Manifest mitgeführt. Ohne Angabe enthält
 *   `person` kein `role`-Feld (kein Default) — bestehende Aufrufe ohne
 *   Rollenangabe funktionieren unverändert.
 * @param {"male" | "female"} [params.gender] Optional. Wird, sofern
 *   angegeben, gegen `GENDER_VALUES` geprüft und unverändert im
 *   Manifest mitgeführt. Ohne Angabe enthält `person` kein
 *   `gender`-Feld (kein Default). Wird für die Auswahl der
 *   Urkunden-Vorlage ausgewertet (siehe
 *   `core/materials/generateCertificateMaterial.js`) — für alle
 *   anderen Materialien weiterhin ohne Wirkung.
 * @param {string} [params.email] Optional. Wird, sofern angegeben,
 *   getrimmt und als gültige E-Mail-Adresse geprüft (siehe
 *   `core/mail/validateEmail.js`). Aktuell von keiner Funktion
 *   ausgewertet — reine Erfassung von Stammdaten.
 * @param {string} [params.phone] Optional. Wird, sofern angegeben,
 *   getrimmt und darf danach nicht leer sein. Keine strenge
 *   internationale Formatprüfung.
 * @param {string} [params.photoUrl] Optional. Wird, sofern angegeben,
 *   getrimmt und als gültige HTTP-/HTTPS-URL geprüft (siehe
 *   `core/text/isHttpUrl.js`). Es wird noch keine Datei abgerufen oder
 *   verarbeitet.
 * @param {string} [params.federalState] Optional. Wird, sofern
 *   angegeben, getrimmt und darf danach nicht leer sein (Freitext).
 * @param {string} [params.region] Optional. Wird, sofern angegeben,
 *   getrimmt und darf danach nicht leer sein (Freitext).
 * @param {Array<string | {key: string}>} [params.materials]
 *   Siehe `buildMaterialFilenames`. Ohne Angabe werden alle sechs
 *   Materialtypen verwendet.
 * @returns {{
 *   version: number,
 *   person: { firstName: string, lastName: string, ifkId: string, gender?: "male" | "female", email?: string, phone?: string, photoUrl?: string, federalState?: string, region?: string },
 *   materials: Array<{ key: string, label: string, category: string, format: string, extension: string, filename: string }>
 * }}
 * @throws {Error} Siehe `buildMaterialFilenames` (fehlender Name,
 *   ungültige IFK-ID, unbekannter Materialtyp) sowie bei ungültigem
 *   `gender`-, `email`-, `phone`-, `photoUrl`-, `federalState`- oder
 *   `region`-Wert.
 */
export function buildMaterialManifest({
  firstName,
  lastName,
  ifkId,
  role,
  gender,
  email,
  phone,
  photoUrl,
  federalState,
  region,
  materials,
} = {}) {
  const filenameEntries = buildMaterialFilenames({ firstName, lastName, ifkId, materials });
  // `buildMaterialFilenames` prüft/normalisiert die IFK-ID bereits nur,
  // wenn mindestens ein ausgewählter Materialtyp sie tatsächlich benötigt
  // (siehe dort) — bei Bedarf identisch für alle Einträge, daher genügt
  // der erste. Ohne Bedarf bleibt sie `undefined` und wird unten NICHT
  // Teil von `person` (kein globaler IFK-ID-Zwang mehr, siehe
  // `core/materials/materialRequirements.js`).
  const normalizedIfkId = filenameEntries[0]?.ifkId;

  const person = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };

  if (normalizedIfkId !== undefined) {
    person.ifkId = normalizedIfkId;
  }

  if (role !== undefined) {
    if (!isValidRoleKey(role)) {
      throw new Error(`buildMaterialManifest: ungültiger Wert für 'role' ("${role}").`);
    }
    person.role = role;
  }

  if (gender !== undefined) {
    if (!VALID_GENDER_VALUES.has(gender)) {
      throw new Error(`buildMaterialManifest: ungültiger Wert für 'gender' ("${gender}").`);
    }
    person.gender = gender;
  }

  if (email !== undefined) {
    const trimmedEmail = typeof email === "string" ? email.trim() : email;
    if (!isValidEmail(trimmedEmail)) {
      throw new Error(`buildMaterialManifest: ungültiger Wert für 'email' ("${email}").`);
    }
    person.email = trimmedEmail;
  }

  if (phone !== undefined) {
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
    if (!trimmedPhone) {
      throw new Error("buildMaterialManifest: 'phone' darf nicht leer sein.");
    }
    person.phone = trimmedPhone;
  }

  if (photoUrl !== undefined) {
    const trimmedPhotoUrl = typeof photoUrl === "string" ? photoUrl.trim() : photoUrl;
    if (!isHttpUrl(trimmedPhotoUrl)) {
      throw new Error(`buildMaterialManifest: ungültiger Wert für 'photoUrl' ("${photoUrl}").`);
    }
    person.photoUrl = trimmedPhotoUrl;
  }

  if (federalState !== undefined) {
    const trimmedFederalState = typeof federalState === "string" ? federalState.trim() : "";
    if (!trimmedFederalState) {
      throw new Error("buildMaterialManifest: 'federalState' darf nicht leer sein.");
    }
    person.federalState = trimmedFederalState;
  }

  if (region !== undefined) {
    const trimmedRegion = typeof region === "string" ? region.trim() : "";
    if (!trimmedRegion) {
      throw new Error("buildMaterialManifest: 'region' darf nicht leer sein.");
    }
    person.region = trimmedRegion;
  }

  return {
    version: 1,
    person,
    materials: filenameEntries.map((entry) => {
      const type = MATERIAL_TYPES_BY_KEY[entry.key];
      return {
        key: entry.key,
        label: entry.label,
        category: type.category,
        format: type.format,
        extension: entry.extension,
        filename: entry.filename,
      };
    }),
  };
}
