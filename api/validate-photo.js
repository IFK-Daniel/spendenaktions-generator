import { isHttpUrl } from "../core/text/isHttpUrl.js";
import { retrieveRepresentativePhotoAsset } from "../core/photo/retrieveRepresentativePhotoAsset.js";

/**
 * Prüft, ob ein im Formular hinterlegter Foto-Link serverseitig
 * tatsächlich als Bild geladen werden kann — testet die
 * Erreichbarkeit (Status 200, Content-Type beginnt mit `image/`).
 *
 * Der eigentliche Abruf (genau ein HTTP-Request) sowie das Bereithalten
 * des geladenen Bildinhalts als In-Memory-"Photo-Asset" liegen in
 * `core/photo/retrieveRepresentativePhotoAsset.js` — bewusst getrennt,
 * damit künftige Materialgeneratoren (z. B. ein Repräsentanten-Flyer,
 * der das Foto einbettet) innerhalb desselben Funktionsaufrufs auf das
 * bereits abgerufene Asset zugreifen können, ohne das Foto ein zweites
 * Mal zu laden. Aktuell hat dieser Endpunkt genau einen Konsumenten
 * (diese Validierungsantwort); noch keine PDF-Erzeugung, keine
 * Bildbearbeitung, keine Speicherung — das Asset existiert
 * ausschließlich für die Dauer dieses Requests und wird hier lediglich
 * als Base64-Inhalt inkl. Größe/Format an den Client zurückgegeben.
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

  const result = await retrieveRepresentativePhotoAsset({ photoUrl });

  if (!result.ok) {
    res.status(200).json({ ok: false, reason: result.reason });
    return;
  }

  const { asset } = result;

  res.status(200).json({
    ok: true,
    size: asset.size,
    format: asset.format,
    contentType: asset.contentType,
    content: Buffer.from(asset.content).toString("base64"),
  });
}
