import { EXTRACTION_STATUS } from "./extractionStatus.js";
import { isLabelEcho } from "./isLabelEcho.js";
import { normalizeGender } from "./normalizeGender.js";
import { normalizePhone } from "./normalizePhone.js";
import { normalizeGermanPhoneNumber } from "./normalizeGermanPhoneNumber.js";
import { isAustrianFederalState } from "./detectAustrianFederalState.js";
import { validateExtractedPaypalUrl } from "./validateExtractedPaypalUrl.js";
import { pickEmailForForm } from "./pickEmailForForm.js";
import { annotateLowConfidenceCharacters } from "./annotateLowConfidenceCharacters.js";
import { isValidEmail } from "../mail/validateEmail.js";
import { validateIfkId } from "../id/validateIfkId.js";

// Ein nach der Beschriftung gefundener "Wert", der offensichtlich
// keine IFK-ID sein kann (z. B. mehrere Wörter oder Anführungszeichen
// aus einem benachbarten Bedienelement, das OCR versehentlich als
// nächste Zeile aufgegriffen hat), gilt als bestätigt leeres Feld
// statt als fehlerhafte Erkennung — IFK-IDs sind laut Format immer
// ein einzelnes, kurzes Token ohne Leerzeichen/Anführungszeichen.
const PLAUSIBLE_IFK_ID_CANDIDATE = /^[^\s"]{1,10}$/;

const CONFIDENCE_THRESHOLD = 60;

function degradeIfLowConfidence(field, confidence, bbox) {
  if (field.status !== EXTRACTION_STATUS.RECOGNIZED) return field;
  if (typeof confidence !== "number") return field;
  if (confidence >= CONFIDENCE_THRESHOLD) return field;
  return { ...field, status: EXTRACTION_STATUS.NEEDS_REVIEW, bbox };
}

/**
 * Bewertet einen bereits als formal gültig erkannten Wert anhand der
 * OCR-Konfidenz — möglichst zeichengenau statt pauschal. Liegen
 * zeichengenaue Konfidenzwerte vor (`raw.symbols`, siehe
 * `core/screenshot/runScreenshotOcr.js`), werden ausschließlich die
 * tatsächlich unsicheren Zeichen markiert (`chars`), während der
 * restliche Wert als sicher gilt — der Status wird nur dann auf
 * `needs_review` herabgestuft, wenn mindestens ein Zeichen unsicher
 * ist. Ohne zeichengenaue Daten bleibt unverändert die bisherige,
 * grobkörnige Bewertung anhand der Gesamt-Konfidenz bestehen.
 */
function applyConfidenceAssessment(field, raw) {
  if (field.status !== EXTRACTION_STATUS.RECOGNIZED || !raw) {
    return field;
  }

  const chars = annotateLowConfidenceCharacters(field.value, raw.symbols);
  if (!chars) {
    return degradeIfLowConfidence(field, raw.confidence, raw.bbox);
  }

  if (!chars.some((c) => c.uncertain)) {
    return field;
  }

  return { ...field, status: EXTRACTION_STATUS.NEEDS_REVIEW, chars, bbox: raw.bbox };
}

function textField(raw) {
  if (!raw || typeof raw.text !== "string" || !raw.text.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = raw.text.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  return applyConfidenceAssessment({ value: trimmed, status: EXTRACTION_STATUS.RECOGNIZED }, raw);
}

function emailField(raw) {
  if (!raw || typeof raw.text !== "string" || !raw.text.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = raw.text.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  if (!isValidEmail(trimmed)) {
    return { value: trimmed, status: EXTRACTION_STATUS.NEEDS_REVIEW };
  }

  return applyConfidenceAssessment({ value: trimmed, status: EXTRACTION_STATUS.RECOGNIZED }, raw);
}

function ifkIdField(raw) {
  if (!raw) {
    // Die Beschriftung "IFK-ID" wurde im Screenshot nirgends gefunden —
    // das lässt keinen Schluss darüber zu, ob eine IFK-ID existiert
    // oder nicht (siehe IFK-ID-Regel).
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  if (raw.confirmedEmpty) {
    // Die Beschriftung wurde eindeutig gefunden, der Wert ist aber
    // nachweislich leer — kein Erkennungsfehler.
    return { value: "", status: EXTRACTION_STATUS.CONFIRMED_EMPTY };
  }

  if (typeof raw.text !== "string" || !raw.text.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = raw.text.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  if (!PLAUSIBLE_IFK_ID_CANDIDATE.test(trimmed)) {
    // Kein plausibles IFK-ID-Token (z. B. mehrere Wörter/Anführungs-
    // zeichen aus einem benachbarten Bedienelement) — gilt als
    // bestätigt leeres Feld statt als fehlerhafte Erkennung.
    return { value: "", status: EXTRACTION_STATUS.CONFIRMED_EMPTY };
  }

  const check = validateIfkId(trimmed);
  if (!check.valid) {
    // Eine ungültige IFK-ID wird nie übernommen — auch nicht als
    // prüfbedürftiger Wert, damit sie unter keinen Umständen versehentlich
    // ins Formular gelangt (siehe IFK-ID-Regel).
    return { value: "", status: EXTRACTION_STATUS.NEEDS_REVIEW };
  }

  return applyConfidenceAssessment({ value: check.normalized, status: EXTRACTION_STATUS.RECOGNIZED }, raw);
}

function phoneField(raw, { isAustria } = {}) {
  if (!raw || typeof raw.text !== "string") {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  let normalized = normalizePhone(raw.text);
  if (!normalized || isLabelEcho(normalized)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  // Deutsche internationale Schreibweise (+49…/0049…) auf die im
  // Inland übliche führende "0" umschreiben — außer bei einem
  // erkannten österreichischen Bundesland, da dort auch eine mit "+49"
  // beginnende Nummer nicht fälschlich als deutsche Inlandsnummer
  // umgeschrieben werden soll (siehe `core/screenshot/
  // detectAustrianFederalState.js`). Andere Landesvorwahlen (z. B.
  // +43, +41) werden ohnehin nicht erkannt und bleiben unverändert.
  if (!isAustria) {
    normalized = normalizeGermanPhoneNumber(normalized);
  }

  return applyConfidenceAssessment({ value: normalized, status: EXTRACTION_STATUS.RECOGNIZED }, raw);
}

function genderField(raw) {
  // Der Wert ("male"/"female") ist eine Klassifizierung des erkannten
  // Worts, keine zeichengetreue Wiedergabe — eine zeichengenaue
  // Zuordnung zu den OCR-Symbolen ist hier nicht sinnvoll möglich,
  // daher bleibt es bei der groben Konfidenzbewertung.
  const result = normalizeGender(raw ? raw.text : "");
  return degradeIfLowConfidence(result, raw ? raw.confidence : undefined, raw ? raw.bbox : undefined);
}

function paypalUrlField(raw) {
  const result = validateExtractedPaypalUrl(raw ? raw.text : "");
  return applyConfidenceAssessment(result, raw);
}

/**
 * Validiert die aus den OCR-Zeilen extrahierten Rohfelder
 * (`core/screenshot/extractRawFieldsFromOcrLines.js`) gegen das
 * strikte interne Schema — mit denselben Core-Funktionen wie bei
 * manueller Formulareingabe. OCR-Konfidenzwerte fließen zusätzlich in
 * die Statusbewertung ein: liegen zeichengenaue Konfidenzwerte vor,
 * wird nur bei tatsächlich unsicheren Zeichen auf `needs_review`
 * herabgestuft (siehe `applyConfidenceAssessment`); andernfalls gilt
 * weiterhin die grobe Gesamt-Konfidenz-Schwelle. Bei `needs_review`
 * wird zusätzlich `bbox` (falls verfügbar) durchgereicht, damit die UI
 * einen Bildausschnitt der Originalzeile anzeigen kann.
 *
 * Die IFK-ID erhält eine dritte, eigene Ausprägung: eine eindeutig
 * gefundene, aber nachweislich leere Beschriftung ergibt
 * `confirmed_empty` statt `needs_review` (siehe `ifkIdField`). Die
 * Telefonnummer wird zusätzlich von deutscher internationaler
 * Schreibweise (`+49…`/`0049…`) auf die inländische `0…`-Schreibweise
 * umgestellt — außer bei einem erkannten österreichischen Bundesland
 * (`core/screenshot/detectAustrianFederalState.js`).
 *
 * @param {Record<string, { text: string, confidence?: number, symbols?: { text: string, confidence: number }[], bbox?: { x0: number, y0: number, x1: number, y1: number }, confirmedEmpty?: boolean } | null>} rawFields
 * @returns {object} Struktur gemäß dem in der Anforderung beschriebenen
 *   internen Ergebnisformat.
 */
export function buildExtractionFields(rawFields) {
  const source = rawFields && typeof rawFields === "object" ? rawFields : {};

  const firstName = textField(source.firstName);
  const lastName = textField(source.lastName);
  const gender = genderField(source.gender);
  const federalState = textField(source.federalState);
  const isAustria = federalState.status === EXTRACTION_STATUS.RECOGNIZED && isAustrianFederalState(federalState.value);
  const phone = phoneField(source.phone, { isAustria });
  const region = textField(source.region);
  const ifkEmail = emailField(source.ifkEmail);
  const regularEmail = emailField(source.regularEmail);
  const ifkId = ifkIdField(source.ifkId);
  const paypalUrl = paypalUrlField(source.paypalUrl);

  const emailForForm = pickEmailForForm(ifkEmail, regularEmail);

  return {
    firstName,
    lastName,
    gender,
    phone,
    federalState,
    region,
    ifkEmail,
    regularEmail,
    emailForForm,
    ifkId,
    paypalUrl,
  };
}
