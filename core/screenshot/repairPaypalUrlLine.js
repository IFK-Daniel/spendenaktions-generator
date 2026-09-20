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

  const url = String(result?.text ?? "").replace(/\s+/g, "");
  if (!PAYPAL_URL_PATTERN.test(url)) return lines;

  const first = valueWords[0];
  const confidence = typeof result.confidence === "number" ? result.confidence : undefined;
  const urlWord = { text: url, confidence, x0: first.x0, y0: top, x1: right, y1: top + height };
  const repaired = {
    ...labelLine,
    text: `${labelWords.map((w) => w.text).join(" ")} ${url}`,
    words: [...labelWords, urlWord],
  };
  return lines.map((line, index) => (index === labelIndex ? repaired : line));
}
