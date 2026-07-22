import { isHttpUrl } from "../core/text/isHttpUrl.js";
import { classifyPhotoFetchResponse } from "../core/photo/classifyPhotoFetchResponse.js";
import { classifyPhotoFetchException } from "../core/photo/classifyPhotoFetchException.js";
import { detectImageFormatFromContentType } from "../core/photo/detectImageFormatFromContentType.js";

const FETCH_TIMEOUT_MS = 8000;

/**
 * Prüft, ob ein im Formular hinterlegter Foto-Link serverseitig
 * tatsächlich als Bild geladen werden kann — testet ausschließlich
 * die Erreichbarkeit (Status 200, Content-Type beginnt mit `image/`).
 * Noch keine PDF-Erzeugung, keine Bildbearbeitung, keine Speicherung:
 * das Bild wird bei Erfolg lediglich als Base64-Inhalt inkl. Größe
 * und Format zurückgegeben, damit die aufrufende Seite es in den
 * bestehenden (nicht persistierten) Ergebnisdaten zwischenspeichern
 * kann.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { photoUrl } = req.body || {};

  if (typeof photoUrl !== "string" || !isHttpUrl(photoUrl)) {
    res.status(400).json({ ok: false, error: "Ungültiger Foto-Link." });
    return;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(photoUrl, { signal: controller.signal, redirect: "follow" });
    const contentType = response.headers.get("content-type") || "";

    const classification = classifyPhotoFetchResponse({
      status: response.status,
      contentType,
      redirected: response.redirected,
    });

    if (!classification.ok) {
      res.status(200).json({ ok: false, reason: classification.reason });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();

    res.status(200).json({
      ok: true,
      size: arrayBuffer.byteLength,
      format: detectImageFormatFromContentType(contentType),
      contentType: classification.contentType,
      content: Buffer.from(arrayBuffer).toString("base64"),
    });
  } catch (err) {
    console.error(
      "[validate-photo] Abruf fehlgeschlagen:",
      err instanceof Error ? err.name : "unknown_error"
    );
    res.status(200).json({ ok: false, reason: classifyPhotoFetchException(err) });
  } finally {
    clearTimeout(timeoutHandle);
  }
}
