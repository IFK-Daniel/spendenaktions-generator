import { buildMailTransporter, getMailFromAddress } from "./_lib/buildMailTransporter.js";
import { isValidEmail } from "../core/mail/validateEmail.js";
import { deliverRepresentativeMaterials } from "../core/mail/deliverRepresentativeMaterials.js";

/**
 * Validiert die Anfrage und delegiert den eigentlichen Versand an
 * `core/materials/deliverRepresentativeMaterials.js` (Repräsentanten-
 * Mail mit ZIP-Anhang + separate humbee-Dokumentations-Mail mit
 * Einzeldateien). Diese Datei bleibt bewusst dünn: SMTP-Transport-
 * Aufbau (`buildMailTransporter`), Request-Validierung und Base64-
 * Dekodierung — die eigentliche Versand-/Log-Logik liegt im
 * DOM-freien, ohne echten Mailserver testbaren Core-Modul.
 *
 * Der Versand gilt nur dann als vollständig erfolgreich, wenn sowohl
 * die Repräsentanten-Mail als auch die humbee-Mail erfolgreich
 * versendet wurden. Beide Versandversuche werden unabhängig
 * voneinander durchgeführt und im Ergebnis einzeln ausgewiesen, damit
 * ein Teilfehler eindeutig benannt werden kann.
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
  const runId = typeof req.headers?.["x-vercel-id"] === "string" ? req.headers["x-vercel-id"] : undefined;

  const result = await deliverRepresentativeMaterials({
    recipient: {
      to: recipient.to,
      subject: recipient.subject,
      text: recipient.text,
      html: recipient.html,
      zipFilename: recipient.zipFilename,
      zipContent: zipBuffer,
    },
    humbee: {
      to: humbee.to,
      subject: humbee.subject,
      text: humbee.text,
      attachments: humbeeAttachments,
    },
    sendMail: (mailOptions) => transporter.sendMail({ from: fromAddress, ...mailOptions }),
    runId,
  });

  res.status(200).json(result);
}
