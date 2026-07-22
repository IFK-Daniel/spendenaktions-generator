import { buildMailTransporter, getMailFromAddress } from "./_lib/buildMailTransporter.js";
import { isValidEmail } from "../core/mail/validateEmail.js";

/**
 * Versendet die Repräsentanten-Mail (ZIP-Anhang) und die separate
 * Dokumentations-Mail an humbee (Einzeldateien als Anhänge). Die
 * Mailinhalte (Betreff/Text/HTML) werden bereits clientseitig über
 * `core/materials/buildRepresentativeDeliveryRequest.js` gebaut — diese
 * Funktion versendet sie ausschließlich, ohne SMTP-Zugangsdaten im
 * Frontend preiszugeben.
 *
 * Der Versand gilt nur dann als vollständig erfolgreich, wenn sowohl
 * die Empfängermail als auch die humbee-Mail erfolgreich versendet
 * wurden. Beide Versandversuche werden unabhängig voneinander
 * durchgeführt und im Ergebnis einzeln ausgewiesen, damit ein
 * Teilfehler eindeutig benannt werden kann.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { recipient, humbee } = req.body || {};

  if (!recipient || typeof recipient.to !== "string" || !isValidEmail(recipient.to)) {
    res.status(400).json({ ok: false, error: "Ungültige Empfänger-E-Mail-Adresse." });
    return;
  }

  if (typeof recipient.zipFilename !== "string" || recipient.zipFilename.trim() === "") {
    res.status(400).json({ ok: false, error: "ZIP-Dateiname fehlt." });
    return;
  }

  if (typeof recipient.zipContent !== "string" || recipient.zipContent.trim() === "") {
    res.status(400).json({ ok: false, error: "ZIP-Anhang fehlt." });
    return;
  }

  if (!humbee || typeof humbee.to !== "string" || !isValidEmail(humbee.to)) {
    res.status(400).json({ ok: false, error: "Ungültige humbee-E-Mail-Adresse." });
    return;
  }

  if (!Array.isArray(humbee.attachments)) {
    res.status(400).json({ ok: false, error: "humbee-Anhänge fehlen." });
    return;
  }

  let zipBuffer;
  let humbeeAttachments;
  try {
    zipBuffer = Buffer.from(recipient.zipContent, "base64");
    humbeeAttachments = humbee.attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
    }));
  } catch {
    res.status(400).json({ ok: false, error: "Anhänge konnten nicht verarbeitet werden." });
    return;
  }

  const transporter = buildMailTransporter();
  const fromAddress = getMailFromAddress();

  const result = {
    recipient: { ok: false },
    humbee: { ok: false },
  };

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: recipient.to,
      subject: recipient.subject,
      text: recipient.text,
      html: recipient.html,
      attachments: [{ filename: recipient.zipFilename, content: zipBuffer }],
    });
    result.recipient.ok = true;
  } catch (err) {
    console.error(
      "[send-representative-mail] Versand an Empfänger fehlgeschlagen:",
      err instanceof Error ? err.name : "unknown error"
    );
    result.recipient.error = "Versand an Empfänger fehlgeschlagen. Bitte versuche es später erneut.";
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: humbee.to,
      subject: humbee.subject,
      text: humbee.text,
      attachments: humbeeAttachments,
    });
    result.humbee.ok = true;
  } catch (err) {
    console.error(
      "[send-representative-mail] Dokumentation an humbee fehlgeschlagen:",
      err instanceof Error ? err.name : "unknown error"
    );
    result.humbee.error = "Dokumentation an humbee fehlgeschlagen.";
  }

  const ok = result.recipient.ok && result.humbee.ok;
  res.status(200).json({ ok, ...result });
}
