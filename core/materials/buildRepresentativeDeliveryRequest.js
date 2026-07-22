import { isValidEmail } from "../mail/validateEmail.js";
import { encodeAttachmentBase64 } from "../mail/encodeAttachmentBase64.js";
import {
  buildRepresentativeMailSubject,
  buildRepresentativeMailText,
  buildRepresentativeMailHtml,
} from "../templates/representativeMailContent.js";
import { buildHumbeeMailSubject, buildHumbeeMailText } from "../templates/humbeeMailContent.js";

const HUMBEE_RECIPIENT = "office@its-for-kids.de";

/**
 * Ermittelt die Empfängeradresse für die Repräsentanten-Mail:
 * Standardmäßig `person.email`, bei Angabe einer abweichenden Adresse
 * (nicht-leerer String) stattdessen diese — nach Prüfung über die
 * bestehende `core/mail/validateEmail.js`.
 *
 * @param {object} params
 * @param {{ email?: string }} params.person
 * @param {string} [params.alternativeEmail]
 * @returns {string}
 * @throws {Error} Wenn weder eine gültige abweichende Adresse noch eine
 *   gültige `person.email` vorliegt.
 */
export function resolveRepresentativeRecipient({ person, alternativeEmail } = {}) {
  if (typeof alternativeEmail === "string" && alternativeEmail.trim() !== "") {
    const trimmed = alternativeEmail.trim();
    if (!isValidEmail(trimmed)) {
      throw new Error("resolveRepresentativeRecipient: ungültige abweichende E-Mail-Adresse.");
    }
    return trimmed;
  }

  if (!person || !isValidEmail(person.email)) {
    throw new Error("resolveRepresentativeRecipient: keine gültige E-Mail-Adresse im Formular hinterlegt.");
  }
  return person.email;
}

/**
 * Baut den vollständigen, versandfertigen Request-Payload für den
 * Materialversand: eine Mail an den Repräsentanten (bzw. die
 * abweichende Adresse) mit dem ZIP-Archiv als einzigem Anhang, sowie
 * eine separate Dokumentations-Mail an humbee mit den tatsächlich
 * erzeugten Materialien als Einzeldateien (keine ZIP-Datei).
 *
 * Reine, DOM-freie Datenzusammenstellung — löst selbst keinen Versand
 * aus (siehe `core/mail/sendRepresentativeMaterials.js`).
 *
 * @param {object} params
 * @param {{ person: { firstName: string, lastName: string, ifkId: string, gender?: string, federalState?: string, region?: string, email?: string } }} params.manifest
 * @param {{ filename: string, blob: Blob }} params.zip Ergebnis von
 *   `buildMaterialZip()`.
 * @param {Array<{ filename: string, content: Blob | ArrayBuffer | Uint8Array }>} params.files
 *   Die tatsächlich erzeugten Materialdateien (Ergebnis von
 *   `generateQrMaterials()`) — werden humbee einzeln angehängt.
 * @param {string} [params.alternativeEmail] Siehe `resolveRepresentativeRecipient`.
 * @param {string} params.logoUrl Für die HTML-Mail an den Repräsentanten.
 * @returns {Promise<{
 *   recipient: { to: string, subject: string, text: string, html: string, zipFilename: string, zipContent: string },
 *   humbee: { to: string, subject: string, text: string, attachments: Array<{ filename: string, content: string }> }
 * }>}
 * @throws {Error} Siehe `resolveRepresentativeRecipient`.
 */
export async function buildRepresentativeDeliveryRequest({ manifest, zip, files, alternativeEmail, logoUrl } = {}) {
  const { person } = manifest;
  const to = resolveRepresentativeRecipient({ person, alternativeEmail });

  const recipient = {
    to,
    subject: buildRepresentativeMailSubject(),
    text: buildRepresentativeMailText({ firstName: person.firstName, gender: person.gender, ifkId: person.ifkId }),
    html: buildRepresentativeMailHtml({
      firstName: person.firstName,
      gender: person.gender,
      ifkId: person.ifkId,
      logoUrl,
    }),
    zipFilename: zip.filename,
    zipContent: await encodeAttachmentBase64(zip.blob),
  };

  const humbeeAttachments = [];
  for (const file of files ?? []) {
    humbeeAttachments.push({
      filename: file.filename,
      content: await encodeAttachmentBase64(file.content),
    });
  }

  const humbee = {
    to: HUMBEE_RECIPIENT,
    subject: buildHumbeeMailSubject({
      federalState: person.federalState,
      region: person.region,
      lastName: person.lastName,
      firstName: person.firstName,
    }),
    text: buildHumbeeMailText({ firstName: person.firstName, lastName: person.lastName, ifkId: person.ifkId }),
    attachments: humbeeAttachments,
  };

  return { recipient, humbee };
}
