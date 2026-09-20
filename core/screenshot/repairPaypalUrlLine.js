// Manche humbee-Layouts (z. B. Botschafter) brechen die lange PayPal-URL
// auf zwei Zeilen um. Die erste OCR-Auswertung liest die Wertespalte dort
// gelegentlich nur als Störzeichen (z. B. "EEE") statt als Link. Diese
// Nachbesserung liest den Wertebereich der "Paypal-URL"-Zeile gezielt ein
// zweites Mal (vergrößert, siehe `runScreenshotOcr.js`) und setzt den
// Link als einen Wert an die Beschriftung. Greift NUR, wenn im ersten
// Durchlauf nirgends ein PayPal-Link erkannt wurde — funktionierende
// Screenshots bleiben unverändert.

const PAYPAL_LABEL_PATTERN = /^\W*paypal[-\s]?url/i;
const PAYPAL_URL_PATTERN = /https?:\/\/\S*paypal\S*/i;
const REGION_TOP_PADDING_PX = 10;

// Eine PayPal-"hosted_button_id" hat immer genau 13 Zeichen (A–Z, 0–9).
// Die Zweitlesung liefert je nach Vergrößerung leicht unterschiedliche
// Ergebnisse (z. B. ein eingeschobenes "I"); die Länge trennt die
// brauchbaren von den fehlerhaften Lesungen zuverlässig.
const HOSTED_BUTTON_ID_PATTERN = /hosted_button_id=([A-Za-z0-9]+)$/;
const VALID_ID_LENGTH = 13;
// Unterhalb der Erkennungsschwelle der Auswertung (60, siehe
// `buildExtractionFields.js`): der Wert erscheint als "prüfbedürftig",
// mit Bildausschnitt zum Vergleichen, statt still als "erkannt" zu gelten.
export const UNCERTAIN_REPAIR_CONFIDENCE = 55;

function normalizeReading(reading) {
  const url = String(reading?.text ?? "").replace(/\s+/g, "");
  if (!PAYPAL_URL_PATTERN.test(url)) return null;
  const idMatch = url.match(HOSTED_BUTTON_ID_PATTERN);
  return {
    url,
    confidence: typeof reading.confidence === "number" ? reading.confidence : undefined,
    validId: Boolean(idMatch) && idMatch[1].length === VALID_ID_LENGTH,
  };
}

/**
 * Wählt aus mehreren Lesungen desselben Bereichs die vertrauenswürdigste.
 * - Nur Lesungen mit gültiger ID-Länge kommen infrage; stimmen mindestens
 *   zwei davon überein, gilt der Link als sicher gelesen.
 * - Sonst wird die häufigste gültige (bzw. ohne gültige: die erste)
 *   Lesung genommen, ihre Konfidenz aber unter die Erkennungsschwelle
 *   gesetzt → "prüfbedürftig".
 * @returns {{ url: string, confidence?: number } | null}
 */
export function pickPaypalReading(readings) {
  const normalized = (readings ?? []).map(normalizeReading).filter(Boolean);
  if (normalized.length === 0) return null;

  const valid = normalized.filter((r) => r.validId);
  const pool = valid.length > 0 ? valid : normalized;

  const counts = new Map();
  for (const r of pool) counts.set(r.url, (counts.get(r.url) ?? 0) + 1);
  const [bestUrl, bestCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const best = pool.find((r) => r.url === bestUrl);

  const confident = valid.length > 0 && bestCount >= 2;
  const baseConfidence = best.confidence;
  return {
    url: bestUrl,
    confidence: confident
      ? baseConfidence
      : Math.min(baseConfidence ?? UNCERTAIN_REPAIR_CONFIDENCE, UNCERTAIN_REPAIR_CONFIDENCE),
  };
}
const MIN_REGION_HEIGHT_PX = 40;

function lineBox(line) {
  const words = line.words || [];
  if (words.length === 0) return null;
  return {
    y0: Math.min(...words.map((w) => w.y0)),
    y1: Math.max(...words.map((w) => w.y1)),
  };
}

/**
 * @param {Array<{ text: string, confidence?: number, words?: object[] }>} lines
 * @param {(rect: { left: number, top: number, width: number, height: number }) => Promise<{ text: string, confidence?: number } | null>} recognizeRegion
 * @returns {Promise<Array>} Neue Zeilenliste (oder dieselbe, wenn nichts zu reparieren war).
 */
export async function repairPaypalUrlLine(lines, recognizeRegion) {
  if (!Array.isArray(lines) || typeof recognizeRegion !== "function") return lines;

  const hasUrlAlready = lines.some(
    (line) => Array.isArray(line.words) && line.words.some((word) => PAYPAL_URL_PATTERN.test(word.text || ""))
  );
  if (hasUrlAlready) return lines;

  const labelIndex = lines.findIndex(
    (line) => PAYPAL_LABEL_PATTERN.test(line.text || "") && Array.isArray(line.words) && line.words.length >= 2
  );
  if (labelIndex === -1) return lines;

  const labelLine = lines[labelIndex];
  const words = labelLine.words;
  // Wörter der Beschriftung: alles bis zum ersten Wort, das nicht mehr
  // zu "Paypal-URL"/"Paypal URL" gehört.
  const labelWordCount = /^\W*paypal-?url/i.test(words[0].text || "") ? 1 : 2;
  const labelWords = words.slice(0, labelWordCount);
  const valueWords = words.slice(labelWordCount);
  if (valueWords.length === 0) return lines;

  const box = lineBox(labelLine);
  const left = labelWords[labelWords.length - 1].x1 + 8;
  const allX1 = lines.flatMap((line) => (line.words || []).map((w) => w.x1)).filter((x) => typeof x === "number");
  const right = Math.max(...allX1) + 4;
  const top = Math.max(0, Math.min(box.y0, ...valueWords.map((w) => w.y0)) - REGION_TOP_PADDING_PX);

  // Untere Grenze: Beginn der nächsten Zeile unterhalb der Beschriftung.
  const nextTops = lines
    .filter((_, index) => index !== labelIndex)
    .map(lineBox)
    .filter((b) => b && b.y0 > box.y1)
    .map((b) => b.y0);
  const bottom = nextTops.length > 0 ? Math.min(...nextTops) - 2 : box.y1 + (box.y1 - box.y0) * 3;
  const height = Math.max(bottom - top, MIN_REGION_HEIGHT_PX);

  let result;
  try {
    result = await recognizeRegion({ left, top, width: right - left, height });
  } catch {
    return lines;
  }

  // `result`: entweder eine einzelne Lesung `{ text, confidence }` oder
  // mehrere unter `readings` (siehe `runScreenshotOcr.js`).
  const picked = pickPaypalReading(Array.isArray(result?.readings) ? result.readings : [result]);
  if (!picked) return lines;
  const url = picked.url;

  const first = valueWords[0];
  const confidence = picked.confidence;
  const urlWord = { text: url, confidence, x0: first.x0, y0: top, x1: right, y1: top + height };
  const repaired = {
    ...labelLine,
    text: `${labelWords.map((w) => w.text).join(" ")} ${url}`,
    words: [...labelWords, urlWord],
  };
  return lines.map((line, index) => (index === labelIndex ? repaired : line));
}
