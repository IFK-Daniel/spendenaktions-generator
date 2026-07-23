import { EXTRACTION_STATUS } from "./extractionStatus.js";

const MALE_VALUES = new Set(["männlich", "mann", "male", "m"]);
const FEMALE_VALUES = new Set(["weiblich", "frau", "female", "w", "f"]);

/**
 * Normalisiert einen vom Vision-Modell erkannten Geschlecht-Freitext
 * auf `"male"`/`"female"`. Unklare oder fehlende Werte werden bewusst
 * NICHT geraten, sondern als leer + prüfbedürftig markiert.
 *
 * @param {*} value
 * @returns {{ value: "male" | "female" | "", status: string }}
 */
export function normalizeGender(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const normalized = value.trim().toLowerCase();

  if (MALE_VALUES.has(normalized)) {
    return { value: "male", status: EXTRACTION_STATUS.RECOGNIZED };
  }

  if (FEMALE_VALUES.has(normalized)) {
    return { value: "female", status: EXTRACTION_STATUS.RECOGNIZED };
  }

  return { value: "", status: EXTRACTION_STATUS.NEEDS_REVIEW };
}
