/**
 * Client-Wrapper für den serverseitigen Versand-Endpunkt
 * (`/api/send-representative-mail`). Baut selbst keine Mailinhalte
 * (siehe `core/materials/buildRepresentativeDeliveryRequest.js`) und
 * enthält keine Zugangsdaten — reiner Transport, analog zu
 * `core/mail/sendGeneratedMaterials.js`.
 *
 * @param {{
 *   recipient: { to: string, subject: string, text: string, html: string, zipFilename: string, zipContent: string },
 *   humbee: { to: string, subject: string, text: string, attachments: Array<{ filename: string, content: string }> }
 * }} request Ergebnis von `buildRepresentativeDeliveryRequest()`.
 * @returns {Promise<{
 *   ok: boolean,
 *   recipient: { ok: boolean, error?: string },
 *   humbee: { ok: boolean, error?: string }
 * }>}
 */
export async function sendRepresentativeMaterials(request) {
  const response = await fetch("/api/send-representative-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok && !result.recipient && !result.humbee) {
    return {
      ok: false,
      recipient: { ok: false, error: result.error || "Versand fehlgeschlagen." },
      humbee: { ok: false, error: result.error || "Versand fehlgeschlagen." },
    };
  }

  return {
    ok: result.ok === true,
    recipient: result.recipient ?? { ok: false, error: "Versand fehlgeschlagen." },
    humbee: result.humbee ?? { ok: false, error: "Versand fehlgeschlagen." },
  };
}
