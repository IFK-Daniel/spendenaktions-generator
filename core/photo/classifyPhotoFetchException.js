/**
 * Ordnet eine beim Foto-Abruf geworfene Ausnahme (z. B. von
 * `fetch()`/`AbortController`) einer Fehlerkategorie zu. Reine,
 * netzwerkfreie Zuordnungslogik — der eigentliche `fetch()`-Aufruf
 * und dessen Timeout-Steuerung liegen in `api/validate-photo.js`.
 *
 * @param {unknown} err
 * @returns {"timeout" | "http_error"} `"timeout"` bei einem durch
 *   `AbortController` abgebrochenen Request (Node/Browser werfen dann
 *   einen Fehler mit `name === "AbortError"`), sonst `"http_error"`
 *   (z. B. DNS-Fehler, Verbindungsabbruch).
 */
export function classifyPhotoFetchException(err) {
  if (err && typeof err === "object" && err.name === "AbortError") {
    return "timeout";
  }
  return "http_error";
}
