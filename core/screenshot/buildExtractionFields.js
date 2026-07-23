import { EXTRACTION_STATUS } from "./extractionStatus.js";
import { isLabelEcho } from "./isLabelEcho.js";
import { normalizeGender } from "./normalizeGender.js";
import { normalizePhone } from "./normalizePhone.js";
import { validateExtractedPaypalUrl } from "./validateExtractedPaypalUrl.js";
import { pickEmailForForm } from "./pickEmailForForm.js";
import { isValidEmail } from "../mail/validateEmail.js";
import { validateIfkId } from "../id/validateIfkId.js";

const CONFIDENCE_THRESHOLD = 60;

function degradeIfLowConfidence(field, confidence) {
  if (field.status !== EXTRACTION_STATUS.RECOGNIZED) return field;
  if (typeof confidence !== "number") return field;
  if (confidence >= CONFIDENCE_THRESHOLD) return field;
  return { ...field, status: EXTRACTION_STATUS.NEEDS_REVIEW };
}

function textField(raw) {
  if (!raw || typeof raw.text !== "string" || !raw.text.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = raw.text.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  return degradeIfLowConfidence({ value: trimmed, status: EXTRACTION_STATUS.RECOGNIZED }, raw.confidence);
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

  return degradeIfLowConfidence({ value: trimmed, status: EXTRACTION_STATUS.RECOGNIZED }, raw.confidence);
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

  return degradeIfLowConfidence({ value: check.normalized, status: EXTRACTION_STATUS.RECOGNIZED }, raw.confidence);
}

function phoneField(raw) {
  if (!raw || typeof raw.text !== "string") {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const normalized = normalizePhone(raw.text);
  if (!normalized || isLabelEcho(normalized)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  return degradeIfLowConfidence({ value: normalized, status: EXTRACTION_STATUS.RECOGNIZED }, raw.confidence);
}

function genderField(raw) {
  const result = normalizeGender(raw ? raw.text : "");
  return degradeIfLowConfidence(result, raw ? raw.confidence : undefined);
}

function paypalUrlField(raw) {
  const result = validateExtractedPaypalUrl(raw ? raw.text : "");
  return degradeIfLowConfidence(result, raw ? raw.confidence : undefined);
}

/**
 * Validiert die aus den OCR-Zeilen extrahierten Rohfelder
 * (`core/screenshot/extractRawFieldsFromOcrLines.js`) gegen das
 * strikte interne Schema — mit denselben Core-Funktionen wie bei
 * manueller Formulareingabe. OCR-Konfidenzwerte fließen zusätzlich in
 * die Statusbewertung ein: ein an sich gültiger, aber mit niedriger
 * Konfidenz erkannter Wert wird von `recognized` auf `needs_review`
 * herabgestuft, statt unsicher übernommen zu werden.
 *
 * @param {Record<string, { text: string, confidence?: number } | null>} rawFields
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
