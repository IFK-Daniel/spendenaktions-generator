import { buildMailTransporter, getMailFromAddress } from "./_lib/buildMailTransporter.js";
import { deliverRepresentativeMaterials } from "../core/mail/deliverRepresentativeMaterials.js";
import { parseMultipartFormData } from "../core/mail/parseMultipartFormData.js";
import { buildRepresentativeMailPayloadsFromMultipart } from "../core/mail/buildRepresentativeMailPayloadsFromMultipart.js";

const LOG_PREFIX = "[api/send-representative-mail]";

/**
 * Validiert die Anfrage und delegiert den eigentlichen Versand an
 * `core/materials/deliverRepresentativeMaterials.js` (Repräsentanten-
 * Mail mit ZIP-Anhang + separate humbee-Dokumentations-Mail mit
 * Einzeldateien). Diese Datei bleibt bewusst dünn: Multipart-Parsing,
 * Request-Validierung — die eigentliche Versand-/Log-Logik liegt im
 * DOM-freien, ohne echten Mailserver testbaren Core-Modul
 * (`deliverRepresentativeMaterials.js`, UNVERÄNDERT gegenüber der
 * vorherigen JSON/Base64-Architektur: sie erwartete bereits vorher
 * `recipient.zipContent`/`humbee.attachments[].content` als `Buffer` —
 * nur WOHER dieser Buffer kommt, hat sich geändert).
 *
 * TRANSPORT: `multipart/form-data` statt JSON mit Base64-kodierten
 * Dateiinhalten (Migration siehe `core/mail/sendRepresentativeMaterials.js`
 * und `artifacts/size-analysis/attachment-size-analysis.md`, Abschnitt
 * 8). Vercel Node-Functions parsen `req.body` automatisch nur für
 * `application/json`/`application/x-www-form-urlencoded`/`text/plain`
 * — für `multipart/form-data` bleibt `req` ein rohes, lesbares
 * Node-Stream-Objekt (`http.IncomingMessage`), das hier direkt an
 * `core/mail/parseMultipartFormData.js` (intern `busboy`) weiter-
 * gereicht wird. Kein `bodyParser`-Konfigurationsfeld nötig (das ist
 * ein Next.js-API-Routes-Konzept, hier eine eigenständige
 * Vercel-Function ohne Next.js).
 *
 * Dieser Endpunkt wird ausschließlich vom internen Materialgenerator
 * (`src/intern/generator.js`) aufgerufen (keine weiteren Aufrufer im
 * Repository) — daher vollständige Migration statt eines parallel
 * unterstützten Alt-JSON-Pfads (siehe Vorgabe: "Falls der Endpunkt
 * ausschließlich intern verwendet wird: sauber vollständig migrieren").
 *
 * Weiterhin: `recipient` und `humbee` sind beide EINZELN optional —
 * der Client (`core/mail/sendRepresentativeMaterials.js`) ruft diesen
 * Endpunkt in ZWEI getrennten Requests auf (einmal nur `recipient`,
 * einmal nur `humbee`), damit ein einzelner Request nicht das
 * kombinierte Datenvolumen beider Mails tragen muss (Vercel-Limit
 * ~4,5 MB Request-Body, Node-Runtime, nicht per Konfiguration
 * erhöhbar).
 */
export default async function handler(req, res) {
  const runId = typeof req.headers?.["x-vercel-id"] === "string" ? req.headers["x-vercel-id"] : undefined;
  const logMeta = runId ? ` runId=${runId}` : "";

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  console.log(`${LOG_PREFIX} request received${logMeta}`);

  const contentType = req.headers?.["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data")) {
    console.log(`${LOG_PREFIX} rejected: kein multipart/form-data${logMeta}`);
    res.status(400).json({ ok: false, error: "Erwartet multipart/form-data." });
    return;
  }

  let parsed;
  try {
    parsed = await parseMultipartFormData(req);
  } catch (err) {
    console.log(`${LOG_PREFIX} rejected: Multipart-Parsing fehlgeschlagen (${err instanceof Error ? err.name : "unknown"})${logMeta}`);
    res.status(400).json({ ok: false, error: "Anhänge konnten nicht verarbeitet werden." });
    return;
  }

  let metadata;
  try {
    metadata = JSON.parse(parsed.fields.metadata || "");
  } catch {
    console.log(`${LOG_PREFIX} rejected: metadata-Feld fehlt oder ist kein gültiges JSON${logMeta}`);
    res.status(400).json({ ok: false, error: "Versanddaten fehlen oder sind ungültig." });
    return;
  }

  const built = buildRepresentativeMailPayloadsFromMultipart({ metadata, files: parsed.files });
  if (!built.ok) {
    console.log(`${LOG_PREFIX} rejected: ${built.error}${logMeta}`);
    res.status(400).json({ ok: false, error: built.error });
    return;
  }
  const { recipientPayload, humbeePayload } = built;

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
