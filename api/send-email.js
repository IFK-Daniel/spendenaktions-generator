import nodemailer from "nodemailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripDataUrlPrefix(value) {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex !== -1) {
    return value.slice(commaIndex + 1);
  }
  return value;
}

function buildTransporter() {
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { email, campaignTitle, paypalLink, infoOptIn, attachments } = req.body || {};

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ ok: false, error: "Ungültige E-Mail-Adresse." });
    return;
  }

  if (!Array.isArray(attachments) || attachments.length !== 4) {
    res.status(400).json({ ok: false, error: "Anhänge fehlen oder unvollständig." });
    return;
  }

  let mailAttachments;
  try {
    mailAttachments = attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(stripDataUrlPrefix(att.content), "base64"),
    }));
  } catch {
    res.status(400).json({ ok: false, error: "Anhänge konnten nicht verarbeitet werden." });
    return;
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const transporter = buildTransporter();
  const title = typeof campaignTitle === "string" && campaignTitle.trim() ? campaignTitle.trim() : "Kampagne";
  const logoUrl = `https://${req.headers.host}/ifk-logo-full.png`;

  const textBody = [
    "Hallo,",
    "",
    "vielen Dank für Deinen Einsatz zugunsten benachteiligter Kinder!",
    "",
    `im Anhang findest Du Deine QR-Codes und Materialien für Deine Spendenaktion „${title}“:`,
    "- PayPal QR-Code Schwarz",
    "- PayPal QR-Code IFK-Grün",
    "- GiroCode Schwarz",
    "- GiroCode IFK-Grün",
    "",
    "Wir wünschen Dir viel Erfolg mit Deiner Aktion!",
    "",
    "Herzliche Grüße",
    "Dein Team der Stiftung It's for Kids",
  ].join("\n");

  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #575756; max-width: 480px;">
      <img src="${logoUrl}" alt="Stiftung It's for Kids" width="96" style="display: block; margin-bottom: 24px;" />
      <p>Hallo,</p>
      <p>vielen Dank für Deinen Einsatz zugunsten benachteiligter Kinder!</p>
      <p>Im Anhang findest Du Deine QR-Codes und Materialien für Deine Spendenaktion „${title}“:</p>
      <ul>
        <li>PayPal QR-Code Schwarz</li>
        <li>PayPal QR-Code IFK-Grün</li>
        <li>GiroCode Schwarz</li>
        <li>GiroCode IFK-Grün</li>
      </ul>
      <p>Wir wünschen Dir viel Erfolg mit Deiner Aktion!</p>
      <p>Herzliche Grüße<br />Dein Team der Stiftung It's for Kids</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Deine QR-Codes & Materialien – ${title}`,
      text: textBody,
      html: htmlBody,
      attachments: mailAttachments,
    });

    if (infoOptIn === true && process.env.INFO_RECIPIENT) {
      await transporter.sendMail({
        from: fromAddress,
        to: process.env.INFO_RECIPIENT,
        subject: `Neue Spendenaktion: ${title}`,
        text: [
          `Kampagnenname: ${title}`,
          `PayPal-Link: ${typeof paypalLink === "string" ? paypalLink : "-"}`,
          `Empfänger-E-Mail: ${email}`,
        ].join("\n"),
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[send-email] Versand fehlgeschlagen:", err instanceof Error ? err.name : "unknown error");
    res.status(500).json({ ok: false, error: "Versand fehlgeschlagen. Bitte versuche es später erneut." });
  }
}
