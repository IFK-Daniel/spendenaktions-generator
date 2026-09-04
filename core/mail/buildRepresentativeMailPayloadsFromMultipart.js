import { isValidEmail } from "./validateEmail.js";

/**
 * Übersetzt das Ergebnis von `parseMultipartFormData.js` (Textfelder +
 * binäre Dateiteile) in genau das Payload-Format, das
 * `core/mail/deliverRepresentativeMaterials.js` bereits vorher (in der
 * Base64/JSON-Architektur) erwartete: `recipient.zipContent`/
 * `humbee.attachments[].content` als `Buffer`. Ausgelagert aus
 * `api/send-representative-mail.js`, damit die eigentliche
 * Validierungs-/Zuordnungslogik (welches Feld gehört wohin, welche
 * Datei ist das ZIP) ohne echten HTTP-Server testbar ist — die API-
 * Datei bleibt dadurch ein dünner Adapter (parsen → hier zuordnen →
 * `deliverRepresentativeMaterials` aufrufen), analog zu den übrigen
 * `api/*.js`-Dateien in diesem Projekt.
 *
 * Erwartet im `metadata`-Textfeld ein JSON-Objekt mit `kind: "recipient"`
 * (dann genau EIN Dateiteil = das ZIP-Archiv) oder `kind: "humbee"`
 * (dann beliebig viele Dateiteile = die Einzelanhänge).
 *
 * @param {object} params
 * @param {{ kind?: string, to?: string, subject?: string, text?: string, html?: string, zipFilename?: string }} params.metadata
 *   Bereits aus dem `metadata`-Textfeld geparstes JSON.
 * @param {Array<{ filename: string, mimeType: string, content: Buffer }>} params.files
 *   Alle Dateiteile des Requests, in Upload-Reihenfolge.
 * @returns {
 *   { ok: true, recipientPayload: object } |
 *   { ok: true, humbeePayload: object } |
 *   { ok: false, error: string }
 * }
 */
export function buildRepresentativeMailPayloadsFromMultipart({ metadata, files }) {
  if (!metadata || typeof metadata !== "object") {
    return { ok: false, error: "Versanddaten fehlen oder sind ungültig." };
  }

  if (metadata.kind === "recipient") {
    if (typeof metadata.to !== "string" || !isValidEmail(metadata.to)) {
      return { ok: false, error: "Ungültige Empfänger-E-Mail-Adresse." };
    }
    if (typeof metadata.zipFilename !== "string" || metadata.zipFilename.trim() === "") {
      return { ok: false, error: "ZIP-Dateiname fehlt." };
    }
    if (!Array.isArray(files) || files.length !== 1) {
      return { ok: false, error: "ZIP-Anhang fehlt." };
    }
    return {
      ok: true,
      recipientPayload: {
        to: metadata.to,
        subject: metadata.subject,
        text: metadata.text,
        html: metadata.html,
        zipFilename: metadata.zipFilename,
        zipContent: files[0].content,
      },
    };
  }

  if (metadata.kind === "humbee") {
    if (typeof metadata.to !== "string" || !isValidEmail(metadata.to)) {
      return { ok: false, error: "Ungültige humbee-E-Mail-Adresse." };
    }
    return {
      ok: true,
      humbeePayload: {
        to: metadata.to,
        subject: metadata.subject,
        text: metadata.text,
        attachments: (files ?? []).map((file) => ({ filename: file.filename, content: file.content })),
      },
    };
  }

  return { ok: false, error: "Versanddaten sind unvollständig." };
}
