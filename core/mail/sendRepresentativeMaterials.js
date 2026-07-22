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
 *   representative: { success: boolean, messageId?: string, error?: string },
 *   humbee: { success: boolean, messageId?: string, error?: string }
 * }>}
 */
export async function sendRepresentativeMaterials(request) {
  const response = await fetch("/api/send-representative-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok && !result.representative && !result.humbee) {
    return {
      ok: false,
      representative: { success: false, error: result.error || "Versand fehlgeschlagen." },
      humbee: { success: false, error: result.error || "Versand fehlgeschlagen." },
    };
  }

  return {
    ok: result.ok === true,
    representative: result.representative ?? { success: false, error: "Versand fehlgeschlagen." },
    humbee: result.humbee ?? { success: false, error: "Versand fehlgeschlagen." },
  };
}
