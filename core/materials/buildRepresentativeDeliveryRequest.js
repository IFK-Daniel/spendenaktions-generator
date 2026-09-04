import { isValidEmail } from "../mail/validateEmail.js";
import {
  buildRepresentativeMailSubject,
  buildRepresentativeMailText,
  buildRepresentativeMailHtml,
} from "../templates/representativeMailContent.js";
import {
  buildRepresentativeCertificateMailSubject,
  buildRepresentativeCertificateMailText,
  buildRepresentativeCertificateMailHtml,
} from "../templates/representativeCertificateMailContent.js";
import { buildHumbeeMailSubject, buildHumbeeMailText } from "../templates/humbeeMailContent.js";
import { buildMaterialZip } from "./buildMaterialZip.js";
import { ROLE_KEYS, isValidRoleKey, getCertificateDeliveryMode, CERTIFICATE_DELIVERY_MODES } from "./roleConfig.js";

const HUMBEE_RECIPIENT = "office@its-for-kids.de";

/**
 * Maschinenlesbare Fehlerursachen der Empfängerauflösung. Die
 * Aufrufer-UI bildet diese auf verständliche Meldungen ab — der
 * technische `Error.message` (mit Funktionsnamen) erscheint nur im Log.
 */
export const RECIPIENT_ERROR_CODES = Object.freeze({
  COMPANION_EMAIL_INVALID: "companion_email_invalid",
  ALTERNATIVE_EMAIL_INVALID: "alternative_email_invalid",
});

function recipientError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Ermittelt die Empfängeradresse für den direkten Materialversand an
 * einen Wegbegleiter — rollenunabhängig (Repräsentant, Botschafter,
 * Kurator, Beirat, Fachrat, Wirtschaftsrat).
 *
 * Maßgeblich ist ausschließlich die übergebene, AKTUELL im Formular
 * sichtbare Adresse (`companionEmail`) — kein Wert aus dem Manifest,
 * kein Snapshot aus dem Zeitpunkt der Materialerzeugung, kein alter
 * OCR-/Screenshot-Wert. Bei Angabe einer nicht-leeren abweichenden
 * Adresse (`alternativeEmail`) gewinnt diese. Beide werden über die
 * bestehende `core/mail/validateEmail.js` geprüft.
 *
 * @param {object} params
 * @param {string} [params.companionEmail] Der aktuelle Wert des
 *   Wegbegleiter-E-Mail-Feldes.
 * @param {string} [params.alternativeEmail] Der aktuelle Wert des
 *   Feldes „Abweichende E-Mail-Adresse“.
 * @returns {string}
 * @throws {Error} Mit `code` aus `RECIPIENT_ERROR_CODES`, wenn die
 *   maßgebliche Adresse fehlt oder ungültig ist.
 */
export function resolveCompanionRecipient({ companionEmail, alternativeEmail } = {}) {
  if (typeof alternativeEmail === "string" && alternativeEmail.trim() !== "") {
    const trimmed = alternativeEmail.trim();
    if (!isValidEmail(trimmed)) {
      throw recipientError(
        "resolveCompanionRecipient: ungültige abweichende E-Mail-Adresse.",
        RECIPIENT_ERROR_CODES.ALTERNATIVE_EMAIL_INVALID
      );
    }
    return trimmed;
  }

  const trimmedCompanion = typeof companionEmail === "string" ? companionEmail.trim() : "";
  if (!isValidEmail(trimmedCompanion)) {
    throw recipientError(
      "resolveCompanionRecipient: keine gültige E-Mail-Adresse im Formular hinterlegt.",
      RECIPIENT_ERROR_CODES.COMPANION_EMAIL_INVALID
    );
  }
  return trimmedCompanion;
}

/**
 * Verschmilzt die verbindlichen, aktuell im Formular sichtbaren
 * Wegbegleiter-Daten (`companion`) über die aus dem Manifest bekannten
 * Personendaten. Nur nicht-leere Werte aus `companion` überschreiben —
 * so bleiben Altaufrufe ohne `companion` unverändert, und ein leeres
 * Feld setzt keinen vorhandenen Manifest-Wert auf `undefined`.
 *
 * Fachlich: Die Personendaten (Typ, Name, IFK-ID) gehören zum
 * Wegbegleiter und sind unabhängig davon, an welche Adresse versendet
 * wird. `companion` ist für alle Mail-Teile identisch — nur der
 * separat aufgelöste Empfänger (`to`) unterscheidet sich.
 */
function mergeCompanionData(manifestPerson = {}, companion) {
  const merged = { ...manifestPerson };
  if (!companion || typeof companion !== "object") return merged;
  for (const [key, value] of Object.entries(companion)) {
    const normalized = typeof value === "string" ? value.trim() : value;
    if (normalized !== undefined && normalized !== null && normalized !== "") {
      merged[key] = normalized;
    }
  }
  return merged;
}

/**
 * Fail-safe gegen "undefined"/"null"/"NaN" in einer Benutzer-Mail:
 * scannt die menschenlesbaren Textfelder (nicht die base64-Anhänge) und
 * bricht mit klarer Fehlermeldung ab, bevor eine solche Mail versendet
 * wird. Fehlende Pflichtangaben müssen vorher entweder den betroffenen
 * Satz weglassen oder den Versand blockieren.
 */
const PLACEHOLDER_TOKEN_RE = /\b(undefined|null|NaN)\b/;

function assertNoPlaceholders(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (typeof value === "string" && PLACEHOLDER_TOKEN_RE.test(value)) {
      throw new Error(
        `buildRepresentativeDeliveryRequest: Platzhalterwert im Mailfeld "${label}" — Versand abgebrochen.`
      );
    }
  }
}

/**
 * @deprecated Alter Name aus der reinen Repräsentanten-Phase. Der
 * direkte Versand ist inzwischen für alle Wegbegleiter-Rollen gültig —
 * bitte `resolveCompanionRecipient` verwenden. Bleibt als dünner
 * Adapter erhalten, um evtl. externe Aufrufer nicht zu brechen.
 */
export function resolveRepresentativeRecipient({ person, companionEmail, alternativeEmail } = {}) {
  return resolveCompanionRecipient({
    companionEmail: companionEmail ?? person?.email,
    alternativeEmail,
  });
}

/**
 * Baut den vollständigen, versandfertigen Request-Payload für den
 * Materialversand.
 *
 * FACHLICHE TRENNUNG (siehe `core/materials/roleConfig.js`,
 * `CERTIFICATE_DELIVERY_MODES`): Die Urkunde ist eine persönliche
 * Auszeichnung, kein Marketingmaterial — sie wird deshalb NIE zusammen
 * mit Flyern/QR-Codes im selben ZIP verschickt. Aus den übergebenen
 * `files` (inkl. Urkunde, falls ausgewählt) entstehen bis zu ZWEI
 * unabhängige Mail-"Teile" pro Empfängerseite:
 *
 * - `kind: "materials"` — Flyer, QR-Codes (+ Anleitung im ZIP, siehe
 *   `guideFile`) — entsteht, sobald mindestens ein Nicht-Urkunden-
 *   Material vorhanden ist.
 * - `kind: "certificate"` — ausschließlich die Urkunde als direkter
 *   Anhang (kein ZIP) — entsteht NUR, wenn `getCertificateDeliveryMode()`
 *   für die aktuelle Rolle `"separate_email"` liefert (aktuell nur
 *   `representative`). Für Rollen mit `"blocked"` wird die Urkunde
 *   NIE einem Mail-Teil hinzugefügt — das ist eine Kern-/Core-seitige
 *   Verteidigungslinie (kein reines UI-`disabled`): selbst ein
 *   manipulierter Aufruf mit einer Botschafter-/Kuratoriums-/Beirats-/
 *   Fachrat-/Wirtschaftsrat-Urkunde in `files` kann sie nicht in den
 *   automatisierten Versand einschleusen. `blockedCertificate` im
 *   Rückgabewert informiert den Aufrufer stattdessen, damit die UI eine
 *   fachliche Klartextmeldung zeigen kann (siehe `src/intern/generator.js`).
 *
 * Reine, DOM-freie Datenzusammenstellung — löst selbst keinen Versand
 * aus (siehe `core/mail/sendRepresentativeMaterials.js`, das die
 * zurückgegebenen `recipientMailParts`/`humbeeMailParts` als beliebig
 * viele unabhängige Requests verschickt).
 *
 * @param {object} params
 * @param {{ person: { firstName: string, lastName: string, ifkId: string, role?: string, gender?: string, federalState?: string, region?: string, email?: string } }} params.manifest
 *   `person.role` (technischer Wegbegleiter-Schlüssel) steuert die
 *   Rollenbezeichnung UND die Urkunden-Versandstrategie.
 * @param {Array<{ key: string, label: string, category: string, filename: string, content: Blob | ArrayBuffer | Uint8Array }>} params.files
 *   Die tatsächlich erzeugten Materialdateien (Flyer, QR-Codes,
 *   Urkunde — `category` unterscheidet sie, siehe
 *   `core/materials/materialTypes.js`). KEINE Anleitung (siehe
 *   `guideFile`).
 * @param {{ filename: string, content: Blob | ArrayBuffer | Uint8Array }} [params.guideFile]
 *   Die statische Begleit-Anleitung — landet, sofern vorhanden, NUR im
 *   ZIP der `"materials"`-Empfänger-Mail (nicht bei humbee, nicht bei
 *   der Urkunden-Mail).
 * @param {{ firstName?: string, lastName?: string, ifkId?: string, role?: string, gender?: string, email?: string, federalState?: string, region?: string }} [params.companion]
 *   Die AKTUELL im Formular sichtbaren Wegbegleiter-Daten. Verbindliche
 *   Quelle für Anrede, Rollenbezeichnung und IFK-ID in allen Mail-
 *   Teilen — unabhängig vom gewählten Empfänger. Nicht-leere Werte
 *   überschreiben die aus dem Manifest bekannten (siehe
 *   `mergeCompanionData`); ohne `companion` bleibt alles wie bisher
 *   aus dem Manifest.
 * @param {string} [params.companionEmail] Rückwärtskompatibler
 *   Einzelwert des Wegbegleiter-E-Mail-Feldes. `companion.email` hat
 *   Vorrang; danach dieser Wert; zuletzt `manifest.person.email`.
 * @param {string} [params.alternativeEmail] Siehe `resolveCompanionRecipient`.
 *   Gilt für BEIDE Mail-Teile identisch (Vorgabe: ein Klick, ein
 *   Empfänger für beide Mails).
 * @param {string} params.logoUrl Für die HTML-Mails.
 * @param {string[]} [params.flyerSalutationVariants] Die tatsächlich für
 *   diesen Versand erzeugten Flyer-Ansprache-Varianten (z. B. `["du"]`
 *   oder `["sie"]`) — steuert ausschließlich, ob die Materialien-Mail
 *   den kurzen Hinweis zur optional zusätzlich erhältlichen Sie-Version
 *   enthält (nur wenn "du" ohne "sie" enthalten ist).
 * @returns {Promise<{
 *   recipientMailParts: Array<{ kind: "materials"|"certificate", to: string, subject: string, text: string, html: string, attachmentFilename: string, attachmentBlob: Blob }>,
 *   humbeeMailParts: Array<{ kind: "materials"|"certificate", to: string, subject: string, text: string, attachments: Array<{ filename: string, content: Blob }> }>,
 *   blockedCertificate: { key: string, label: string } | null,
 * }>}
 *   `attachmentBlob`/`attachments[].content` sind rohe `Blob`s (kein
 *   Base64) — der Versand kodiert sie nicht im JSON, sondern überträgt
 *   sie als eigene Dateiteile eines `multipart/form-data`-Requests
 *   (siehe `core/mail/sendRepresentativeMaterials.js`). Jeder Eintrag
 *   in `recipientMailParts`/`humbeeMailParts` wird als EIGENER,
 *   unabhängiger Request verschickt (kein künstliches Zusammenfassen,
 *   keine künstliche Verzögerung).
 * @throws {Error} Siehe `resolveCompanionRecipient`.
 */
export async function buildRepresentativeDeliveryRequest({
  manifest,
  files,
  guideFile,
  companion,
  companionEmail,
  alternativeEmail,
  logoUrl,
  flyerSalutationVariants,
} = {}) {
  // Eine einzige, empfängerunabhängige Personendaten-Quelle für alle
  // Mail-Teile. Der Empfänger (`to`) wird davon getrennt aufgelöst.
  const person = mergeCompanionData(manifest?.person, companion);
  const to = resolveCompanionRecipient({
    companionEmail: companion?.email ?? companionEmail ?? person.email,
    alternativeEmail,
  });

  const allFiles = files ?? [];
  const certificateFiles = allFiles.filter((file) => file.category === "certificate");
  const materialFiles = allFiles.filter((file) => file.category !== "certificate");

  const recipientMailParts = [];
  const humbeeMailParts = [];
  let blockedCertificate = null;

  // ---------- Arbeits-/Marketingmaterialien (Flyer, QR, Anleitung) ----------
  if (materialFiles.length > 0) {
    const zipFiles = guideFile ? [...materialFiles, guideFile] : materialFiles;
    const zip = await buildMaterialZip({
      ifkId: person.ifkId,
      firstName: person.firstName,
      lastName: person.lastName,
      files: zipFiles,
    });

    const variants = Array.isArray(flyerSalutationVariants) ? flyerSalutationVariants : [];
    const includeFlyerSieHint = variants.includes("du") && !variants.includes("sie");

    recipientMailParts.push({
      kind: "materials",
      to,
      subject: buildRepresentativeMailSubject(),
      text: buildRepresentativeMailText({
        firstName: person.firstName,
        gender: person.gender,
        ifkId: person.ifkId,
        role: person.role,
        includeFlyerSieHint,
      }),
      html: buildRepresentativeMailHtml({
        firstName: person.firstName,
        gender: person.gender,
        ifkId: person.ifkId,
        role: person.role,
        logoUrl,
        includeFlyerSieHint,
      }),
      attachmentFilename: zip.filename,
      attachmentBlob: zip.blob,
    });

    humbeeMailParts.push({
      kind: "materials",
      to: HUMBEE_RECIPIENT,
      subject: buildHumbeeMailSubject({
        federalState: person.federalState,
        region: person.region,
        lastName: person.lastName,
        firstName: person.firstName,
        role: person.role,
        kind: "materials",
      }),
      text: buildHumbeeMailText({ firstName: person.firstName, lastName: person.lastName, ifkId: person.ifkId, kind: "materials" }),
      // Bewusst OHNE Anleitung (siehe JSDoc) — genau die tatsächlich
      // individuell erzeugten Marketingmaterialien, wie bisher.
      attachments: materialFiles.map((file) => ({ filename: file.filename, content: file.content })),
    });
  }

  // ---------- Persönliche Urkunde ----------
  if (certificateFiles.length > 0) {
    // Höchstens eine Urkunde pro Person/Durchlauf (eine Checkbox, siehe
    // `src/intern/generator.js`) — der erste Treffer genügt.
    const certificateFile = certificateFiles[0];
    const roleKey = isValidRoleKey(person.role) ? person.role : ROLE_KEYS.REPRESENTATIVE;
    const deliveryMode = getCertificateDeliveryMode(roleKey);

    if (deliveryMode === CERTIFICATE_DELIVERY_MODES.SEPARATE_EMAIL) {
      recipientMailParts.push({
        kind: "certificate",
        to,
        subject: buildRepresentativeCertificateMailSubject({ gender: person.gender }),
        text: buildRepresentativeCertificateMailText({ firstName: person.firstName, gender: person.gender }),
        html: buildRepresentativeCertificateMailHtml({ firstName: person.firstName, gender: person.gender, logoUrl }),
        attachmentFilename: certificateFile.filename,
        attachmentBlob: certificateFile.content,
      });

      humbeeMailParts.push({
        kind: "certificate",
        to: HUMBEE_RECIPIENT,
        subject: buildHumbeeMailSubject({
          federalState: person.federalState,
          region: person.region,
          lastName: person.lastName,
          firstName: person.firstName,
          role: person.role,
          kind: "certificate",
        }),
        text: buildHumbeeMailText({ firstName: person.firstName, lastName: person.lastName, ifkId: person.ifkId, kind: "certificate" }),
        attachments: [{ filename: certificateFile.filename, content: certificateFile.content }],
      });
    } else if (deliveryMode === CERTIFICATE_DELIVERY_MODES.BLOCKED) {
      // BEWUSST kein Mail-Teil — siehe JSDoc oben und
      // `core/materials/roleConfig.js` (`CERTIFICATE_DELIVERY_MODES`)
      // für die fachliche Begründung dieser vorläufigen Sperre.
      blockedCertificate = { key: certificateFile.key, label: certificateFile.label };
    }
    // CERTIFICATE_DELIVERY_MODES.WITH_MATERIALS: aktuell von keiner
    // Rolle genutzt, daher hier bewusst kein Verhalten definiert.
  }

  const placeholderFields = {};
  for (const part of recipientMailParts) {
    placeholderFields[`recipient.${part.kind}.subject`] = part.subject;
    placeholderFields[`recipient.${part.kind}.text`] = part.text;
    placeholderFields[`recipient.${part.kind}.html`] = part.html;
  }
  for (const part of humbeeMailParts) {
    placeholderFields[`humbee.${part.kind}.subject`] = part.subject;
    placeholderFields[`humbee.${part.kind}.text`] = part.text;
  }
  assertNoPlaceholders(placeholderFields);

  return { recipientMailParts, humbeeMailParts, blockedCertificate };
}
