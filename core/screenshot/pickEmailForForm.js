import { EXTRACTION_STATUS } from "./extractionStatus.js";

function hasValue(field) {
  return Boolean(field) && typeof field.value === "string" && field.value.trim() !== "";
}

function isRecognized(field) {
  return hasValue(field) && field.status === EXTRACTION_STATUS.RECOGNIZED;
}

/**
 * Verbindliche E-Mail-Regel für das Formular, DOM-frei und unabhängig
 * vom KI-Prompt abgesichert (siehe Anforderung: diese Priorisierung
 * darf sich nicht allein auf das Modellverhalten verlassen).
 *
 * Ziel: Es soll immer die E-Mail-Adresse ins Formular übernommen
 * werden, die im Screenshot tatsächlich VORHANDEN ist — die
 * IFK-Verkehrsadresse hat dabei Vorrang vor der normalen Mail-Adresse.
 * Eine manuell im Formularfeld eingetippte Adresse wird von dieser
 * Funktion nicht berührt (die Übernahme läuft nur über den
 * "Übernehmen"-Button und fragt bei bereits befüllten Feldern nach).
 *
 * Priorität:
 * 1. Sauber erkannte (gültige) IFK-Mailadresse.
 * 2. Sonst sauber erkannte (gültige) normale Mail-Adresse.
 * 3. Sonst irgendeine im Screenshot vorhandene IFK-Mailadresse — auch
 *    prüfbedürftig (`needs_review`). Die "E-Mail (für Formular)"-Zeile
 *    bleibt dann als prüfbedürftig markiert und wird beim Übernehmen
 *    NICHT als sicher erkannt (grün) behandelt.
 * 4. Sonst irgendeine im Screenshot vorhandene normale Mail-Adresse
 *    (ebenfalls ggf. prüfbedürftig).
 * 5. Sind beide leer → leerer Wert, `source: null`.
 *
 * @param {{ value?: string, status?: string }} [ifkEmail]
 * @param {{ value?: string, status?: string }} [regularEmail]
 * @returns {{ value: string, source: "ifkEmail" | "regularEmail" | null, status: string }}
 *   `status` ist der übernommene Feldstatus (`recognized` /
 *   `needs_review` / `not_recognized`) — er bestimmt in der UI die
 *   Statusanzeige der Zeile und ob der Wert beim Übernehmen als sicher
 *   erkannt gilt.
 */
export function pickEmailForForm(ifkEmail, regularEmail) {
  if (isRecognized(ifkEmail)) {
    return { value: ifkEmail.value, source: "ifkEmail", status: EXTRACTION_STATUS.RECOGNIZED };
  }

  if (isRecognized(regularEmail)) {
    return { value: regularEmail.value, source: "regularEmail", status: EXTRACTION_STATUS.RECOGNIZED };
  }

  if (hasValue(ifkEmail)) {
    return { value: ifkEmail.value.trim(), source: "ifkEmail", status: EXTRACTION_STATUS.NEEDS_REVIEW };
  }

  if (hasValue(regularEmail)) {
    return { value: regularEmail.value.trim(), source: "regularEmail", status: EXTRACTION_STATUS.NEEDS_REVIEW };
  }

  return { value: "", source: null, status: EXTRACTION_STATUS.NOT_RECOGNIZED };
}
