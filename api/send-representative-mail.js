import { buildMailTransporter, getMailFromAddress } from "./_lib/buildMailTransporter.js";
import { isValidEmail } from "../core/mail/validateEmail.js";
import { deliverRepresentativeMaterials } from "../core/mail/deliverRepresentativeMaterials.js";

const LOG_PREFIX = "[api/send-representative-mail]";

/**
 * Validiert die Anfrage und delegiert den eigentlichen Versand an
 * `core/materials/deliverRepresentativeMaterials.js` (Repräsentanten-
 * Mail mit ZIP-Anhang + separate humbee-Dokumentations-Mail mit
 * Einzeldateien). Diese Datei bleibt bewusst dünn: SMTP-Transport-
 * Aufbau (`buildMailTransporter`), Request-Validierung und Base64-
 * Dekodierung — die eigentliche Versand-/Log-Logik liegt im
 * DOM-freien, ohne echten Mailserver testbaren Core-Modul.
 *
 * WICHTIG — `recipient` und `humbee` sind beide EINZELN optional (statt
 * wie zuvor beide zwingend erforderlich): der Client
 * (`core/mail/sendRepresentativeMaterials.js`) ruft diesen Endpunkt in
 * ZWEI getrennten Requests auf (einmal nur `recipient`, einmal nur
 * `humbee`), statt beide Mails in einem einzigen Request zu bündeln.
 * Grund: Vercel Serverless Functions (Node-Runtime) begrenzen den
 * Request-Body auf ~4,5 MB. Bei einem vollständigen Materialsatz
 * (2 Flyer-PDFs + Urkunde + QR-Codes, jeweils base64-kodiert sowohl im
 * ZIP für den Repräsentanten als auch einzeln für humbee) überschritt
 * ein kombinierter Request dieses Limit zuverlässig — Vercel hat den
 * Request dann mit `413 FUNCTION_PAYLOAD_TOO_LARGE` (Klartext, keine
 * JSON-Antwort) abgelehnt, BEVOR dieser Handler überhaupt aufgerufen
 * wurde. Der Client interpretierte die daraufhin nicht parsbare Antwort
 * als Fehlschlag beider Versände — daher die zuvor stets kombiniert
 * angezeigte Meldung "Versand an Empfänger fehlgeschlagen.
 * Dokumentation an humbee fehlgeschlagen.", unabhängig vom tatsächlichen
 * Empfänger. Das Aufteilen in zwei Requests senkt das maximale
 * Datenvolumen pro Request spürbar (kein Doppel-Transport derselben
 * Dateien als ZIP UND einzeln in einem Request) und macht Erfolg/
 * Fehlschlag jeder Mail unabhängig von der jeweils anderen sichtbar.
 */
export default async function handler(req, res) {
  const runId = typeof req.headers?.["x-vercel-id"] === "string" ? req.headers["x-vercel-id"] : undefined;
  const logMeta = runId ? ` runId=${runId}` : "";

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  console.log(`${LOG_PREFIX} request received${logMeta}`);

  const { recipient, humbee } = req.body || {};

  if (!recipient && !humbee) {
    console.log(`${LOG_PREFIX} rejected: weder recipient noch humbee übergeben${logMeta}`);
    res.status(400).json({ ok: false, error: "Weder Empfänger- noch humbee-Versanddaten übergeben." });
    return;
  }

  let recipientPayload;
  if (recipient) {
    if (typeof recipient.to !== "string" || !isValidEmail(recipient.to)) {
      console.log(`${LOG_PREFIX} rejected: ungültige Empfänger-Adresse${logMeta}`);
      res.status(400).json({ ok: false, error: "Ungültige Empfänger-E-Mail-Adresse." });
      return;
    }
    if (typeof recipient.zipFilename !== "string" || recipient.zipFilename.trim() === "") {
      console.log(`${LOG_PREFIX} rejected: ZIP-Dateiname fehlt${logMeta}`);
      res.status(400).json({ ok: false, error: "ZIP-Dateiname fehlt." });
      return;
    }
    if (typeof recipient.zipContent !== "string" || recipient.zipContent.trim() === "") {
      console.log(`${LOG_PREFIX} rejected: ZIP-Anhang fehlt${logMeta}`);
      res.status(400).json({ ok: false, error: "ZIP-Anhang fehlt." });
      return;
    }
    let zipBuffer;
    try {
      zipBuffer = Buffer.from(recipient.zipContent, "base64");
    } catch {
      console.log(`${LOG_PREFIX} rejected: ZIP-Anhang konnte nicht dekodiert werden${logMeta}`);
      res.status(400).json({ ok: false, error: "Anhang konnte nicht verarbeitet werden." });
      return;
    }
    recipientPayload = {
      to: recipient.to,
      subject: recipient.subject,
      text: recipient.text,
      html: recipient.html,
      zipFilename: recipient.zipFilename,
      zipContent: zipBuffer,
    };
  }

  let humbeePayload;
  if (humbee) {
    if (typeof humbee.to !== "string" || !isValidEmail(humbee.to)) {
      console.log(`${LOG_PREFIX} rejected: ungültige humbee-Adresse${logMeta}`);
      res.status(400).json({ ok: false, error: "Ungültige humbee-E-Mail-Adresse." });
      return;
    }
    if (!Array.isArray(humbee.attachments)) {
      console.log(`${LOG_PREFIX} rejected: humbee-Anhänge fehlen${logMeta}`);
      res.status(400).json({ ok: false, error: "humbee-Anhänge fehlen." });
      return;
    }
    let humbeeAttachments;
    try {
      humbeeAttachments = humbee.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, "base64"),
      }));
    } catch {
      console.log(`${LOG_PREFIX} rejected: humbee-Anhänge konnten nicht dekodiert werden${logMeta}`);
      res.status(400).json({ ok: false, error: "Anhänge konnten nicht verarbeitet werden." });
      return;
    }
    humbeePayload = {
      to: humbee.to,
      subject: humbee.subject,
      text: humbee.text,
      attachments: humbeeAttachments,
    };
  }

  console.log(`${LOG_PREFIX} mail aufgebaut, Maildienst wird aufgerufen${logMeta}`);

  const transporter = buildMailTransporter();
  const fromAddress = getMailFromAddress();

  const result = await deliverRepresentativeMaterials({
    recipient: recipientPayload,
    humbee: humbeePayload,
    sendMail: (mailOptions) => transporter.sendMail({ from: fromAddress, ...mailOptions }),
    runId,
  });

  console.log(
    `${LOG_PREFIX} fertig: ok=${result.ok} representative=${result.representative?.success ?? "übersprungen"} humbee=${result.humbee?.success ?? "übersprungen"}${logMeta}`
  );

  res.status(200).json(result);
}
