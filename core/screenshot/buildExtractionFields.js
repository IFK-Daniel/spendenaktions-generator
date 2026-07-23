import { EXTRACTION_STATUS } from "./extractionStatus.js";
import { isLabelEcho } from "./isLabelEcho.js";
import { normalizeGender } from "./normalizeGender.js";
import { normalizePhone } from "./normalizePhone.js";
import { validateExtractedPaypalUrl } from "./validateExtractedPaypalUrl.js";
import { pickEmailForForm } from "./pickEmailForForm.js";
import { annotateLowConfidenceCharacters } from "./annotateLowConfidenceCharacters.js";
import { isValidEmail } from "../mail/validateEmail.js";
import { validateIfkId } from "../id/validateIfkId.js";

const CONFIDENCE_THRESHOLD = 60;

function degradeIfLowConfidence(field, confidence) {
  if (field.status !== EXTRACTION_STATUS.RECOGNIZED) return field;
  if (typeof confidence !== "number") return field;
  if (confidence >= CONFIDENCE_THRESHOLD) return field;
  return { ...field, status: EXTRACTION_STATUS.NEEDS_REVIEW };
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
    return degradeIfLowConfidence(field, raw.confidence);
  }

  if (!chars.some((c) => c.uncertain)) {
    return field;
  }

  return { ...field, status: EXTRACTION_STATUS.NEEDS_REVIEW, chars };
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
  if (!raw || typeof raw.text !== "string" || !raw.text.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = raw.text.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
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

function phoneField(raw) {
  if (!raw || typeof raw.text !== "string") {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const normalized = normalizePhone(raw.text);
  if (!normalized || isLabelEcho(normalized)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  return applyConfidenceAssessment({ value: normalized, status: EXTRACTION_STATUS.RECOGNIZED }, raw);
}

function genderField(raw) {
  // Der Wert ("male"/"female") ist eine Klassifizierung des erkannten
  // Worts, keine zeichengetreue Wiedergabe — eine zeichengenaue
  // Zuordnung zu den OCR-Symbolen ist hier nicht sinnvoll möglich,
  // daher bleibt es bei der groben Konfidenzbewertung.
  const result = normalizeGender(raw ? raw.text : "");
  return degradeIfLowConfidence(result, raw ? raw.confidence : undefined);
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
 * weiterhin die grobe Gesamt-Konfidenz-Schwelle.
 *
 * @param {Record<string, { text: string, confidence?: number, symbols?: { text: string, confidence: number }[] } | null>} rawFields
 * @returns {object} Struktur gemäß dem in der Anforderung beschriebenen
 *   internen Ergebnisformat.
 */
export function buildExtractionFields(rawFields) {
  const source = rawFields && typeof rawFields === "object" ? rawFields : {};

  const firstName = textField(source.firstName);
  const lastName = textField(source.lastName);
  const gender = genderField(source.gender);
  const phone = phoneField(source.phone);
  const federalState = textField(source.federalState);
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
