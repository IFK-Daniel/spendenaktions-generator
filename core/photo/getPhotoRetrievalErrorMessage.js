const BASE_MESSAGE = "Das Foto konnte nicht geladen werden.";

const DETAIL_BY_REASON = Object.freeze({
  http_error: "Der Foto-Link konnte nicht abgerufen werden.",
  timeout: "Zeitüberschreitung beim Abruf.",
  redirect_login: "Der Link führt auf eine Anmelde- oder Weiterleitungsseite statt auf das Bild.",
  invalid_content_type: "Die Antwort enthält kein Bild.",
});

/**
 * Baut die verständliche Fehlermeldung für einen fehlgeschlagenen
 * Foto-Abruf. Beginnt immer mit dem vorgegebenen Basissatz
 * "Das Foto konnte nicht geladen werden." und ergänzt — sofern die
 * Ursache bekannt ist — einen unterscheidenden Klammerzusatz (HTTP-
 * Fehler, Timeout, Weiterleitung auf eine Login-/Anmeldeseite,
 * ungültiger Content-Type).
 *
 * @param {"http_error" | "timeout" | "redirect_login" | "invalid_content_type" | undefined} reason
 * @returns {string}
 */
export function getPhotoRetrievalErrorMessage(reason) {
  const detail = DETAIL_BY_REASON[reason];
  return detail ? `${BASE_MESSAGE} (${detail})` : BASE_MESSAGE;
}
