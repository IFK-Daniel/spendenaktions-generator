import nodemailer from "nodemailer";

/**
 * Baut einen `nodemailer`-Transporter aus denselben SMTP_*-Umgebungs-
 * variablen wie `api/send-email.js`. Bewusst als eigenständige Datei
 * ausgelagert statt aus `api/send-email.js` importiert: der bestehende
 * öffentliche QR-Code-Generator und dessen Mailfunktion dürfen laut
 * Vorgabe nicht verändert werden, daher bleibt dort die identische,
 * kleine Inline-Funktion unangetastet. Neue serverseitige Funktionen
 * (aktuell `api/send-representative-mail.js`) nutzen ab hier diesen
 * gemeinsamen Baustein, statt ihn ein drittes Mal zu duplizieren.
 *
 * @returns {import("nodemailer").Transporter}
 */
export function buildMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Absenderadresse, analog zu `api/send-email.js`.
 * @returns {string}
 */
export function getMailFromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_USER;
}
