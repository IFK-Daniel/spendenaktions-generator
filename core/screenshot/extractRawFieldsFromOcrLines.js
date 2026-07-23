import { OCR_FIELD_LABELS } from "./ocrLabels.js";
import { isLabelEcho } from "./isLabelEcho.js";

// Die humbee-Ansicht zeigt rechts neben jedem Wert eigene
// Bedienelemente (Icons/Buttons), die OCR gelegentlich als
// zusätzliches "Wort" auf derselben Zeile erkennt — meist mit hoher
// Konfidenz, aber inhaltlich irrelevant. Zwei voneinander unabhängige,
// auflösungsunabhängige Signale grenzen ein solches Element vom
// eigentlichen Wert ab:
//  1. Der Abstand zum vorherigen Wort ist ein Vielfaches des Abstands
//     zwischen Beschriftung und Wert derselben Zeile (normaler
//     Wortabstand als Referenz).
//  2. Die Bedienelemente liegen — unabhängig von der Werttext-Länge —
//     stets nahe am rechten Rand der Ansicht (empirisch bei ca.
//     90–97 % der breitesten in der Auswertung vorkommenden
//     Wortposition). Signal 1 allein reicht bei sehr langen Werten
//     (z. B. einer E-Mail-Adresse) nicht aus, da der Abstand zum
//     Rauschwort dann relativ zum eigenen Werttext klein wirkt.
const NOISE_GAP_MULTIPLIER = 3;
const NOISE_EDGE_ZONE_RATIO = 0.85;

function boundingBoxOfWords(words) {
  const withBox = words.filter(
    (w) => typeof w.x0 === "number" && typeof w.y0 === "number" && typeof w.x1 === "number" && typeof w.y1 === "number"
  );
  if (withBox.length === 0) return undefined;

  return {
    x0: Math.min(...withBox.map((w) => w.x0)),
    y0: Math.min(...withBox.map((w) => w.y0)),
    x1: Math.max(...withBox.map((w) => w.x1)),
    y1: Math.max(...withBox.map((w) => w.y1)),
  };
}

function stripLeadingNoise(text) {
  return text.replace(/^[^\p{L}\p{N}]+/u, "");
}

function normalizeForCompare(text) {
  return text.toLowerCase().replace(/:\s*$/, "").trim();
}

function matchLabel(lineText, labelVariants) {
  const cleanedLine = stripLeadingNoise(lineText);
  const lineLower = normalizeForCompare(cleanedLine);

  for (const label of labelVariants) {
    const labelLower = label.toLowerCase();

    if (lineLower === labelLower) {
      return { matched: true, label, remainder: "" };
    }

    if (lineLower.startsWith(labelLower)) {
      const remainder = cleanedLine.slice(label.length).replace(/^[:\s]+/, "").trim();
      if (remainder) {
        return { matched: true, label, remainder };
      }
    }
  }

  return { matched: false, label: "", remainder: "" };
}

/**
 * Findet den Index des ersten Worts in `words`, ab dem die
 * aneinandergereihten Wörter mit `label` beginnen — toleriert dabei
 * führende Störwörter (z. B. ein einzelnes, fehlerkanntes
 * Satzzeichen), die OCR gelegentlich vor eine Beschriftung setzt.
 * Durchsucht nur die ersten paar Wörter, um Fehltreffer zu vermeiden.
 */
function findLabelWordStart(words, label) {
  const labelLower = label.toLowerCase();
  const maxStart = Math.min(words.length, 3);

  for (let start = 0; start < maxStart; start += 1) {
    const joined = words
      .slice(start, start + label.split(/\s+/).length)
      .map((w) => w.text)
      .join(" ");
    if (normalizeForCompare(joined) === labelLower) {
      return start;
    }
  }

  return -1;
}

/**
 * Baut den bereinigten Wert aus den auf die Beschriftung folgenden
 * Wörtern zusammen. Der Abstand zwischen Beschriftung und erstem
 * Wertwort dient als Referenz für "normalen" Wortabstand in dieser
 * Zeile; jedes weitere Wort mit einem deutlich größeren Abstand zum
 * vorherigen Wort gilt als Störung eines Nachbarelements (z. B. ein
 * Icon/Button) und wird verworfen. Ohne Wortpositionsdaten (z. B. in
 * Tests ohne `words`) wird unverändert der komplette Resttext
 * zurückgegeben.
 */
function reconstructValueFromWords(words, valueStartIndex, referenceGap, edgeZoneStartX) {
  const valueWords = words.slice(valueStartIndex);
  if (valueWords.length === 0) return null;

  const gapThreshold = referenceGap && referenceGap > 0 ? referenceGap * NOISE_GAP_MULTIPLIER : Infinity;
  const kept = [];

  for (let i = 0; i < valueWords.length; i += 1) {
    if (typeof edgeZoneStartX === "number" && valueWords[i].x0 >= edgeZoneStartX) break;
    if (i > 0) {
      const gap = valueWords[i].x0 - valueWords[i - 1].x1;
      if (gap > gapThreshold) break;
    }
    kept.push(valueWords[i]);
  }

  if (kept.length === 0) return null;

  return {
    text: kept.map((w) => w.text).join(" ").trim(),
    confidence: Math.min(...kept.map((w) => w.confidence)),
    symbols: kept.every((w) => Array.isArray(w.symbols)) ? kept.flatMap((w) => w.symbols) : undefined,
    bbox: boundingBoxOfWords(kept),
  };
}

function refineWithWordPositions(line, label, remainderConfidence, edgeZoneStartX) {
  if (!Array.isArray(line.words) || line.words.length === 0) {
    return { text: line.remainderText, confidence: remainderConfidence };
  }

  const labelStart = findLabelWordStart(line.words, label);
  if (labelStart === -1) {
    return { text: line.remainderText, confidence: remainderConfidence };
  }

  const labelWordCount = label.split(/\s+/).length;
  const valueStartIndex = labelStart + labelWordCount;
  const labelLastWord = line.words[labelStart + labelWordCount - 1];
  const firstValueWord = line.words[valueStartIndex];
  if (!labelLastWord || !firstValueWord) {
    return { text: line.remainderText, confidence: remainderConfidence };
  }

  const referenceGap = firstValueWord.x0 - labelLastWord.x1;
  const reconstructed = reconstructValueFromWords(line.words, valueStartIndex, referenceGap, edgeZoneStartX);
  return reconstructed || { text: line.remainderText, confidence: remainderConfidence };
}

function computeEdgeZoneStartX(lines) {
  let maxX1 = 0;
  for (const line of lines) {
    if (!Array.isArray(line.words)) continue;
    for (const word of line.words) {
      if (typeof word.x1 === "number" && word.x1 > maxX1) maxX1 = word.x1;
    }
  }
  return maxX1 > 0 ? maxX1 * NOISE_EDGE_ZONE_RATIO : undefined;
}

// Erkennt eine PayPal-URL unabhängig von einer erkannten Beschriftung.
// Grund: Die Beschriftung "Paypal-URL" wird von OCR gelegentlich
// vollständig fehlgelesen (z. B. zu einem einzelnen Störzeichen), der
// eigentliche Link daneben aber zuverlässig erkannt. Da lange
// PayPal-Links im humbee-Layout auf eine zweite Zeile umbrechen, wird
// zusätzlich geprüft, ob die Folgezeile ein Wort in derselben
// Wertespalte enthält (annähernd gleiche horizontale Position wie der
// Linkbeginn) — das ist die Fortsetzung des Links, keine neue
// Beschriftung.
const PAYPAL_URL_PATTERN = /https?:\/\/\S*paypal\S*/i;
const PAYPAL_CONTINUATION_TOLERANCE_PX = 80;

function findPaypalUrlByPattern(lines, edgeZoneStartX) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!Array.isArray(line.words)) continue;

    const urlWord = line.words.find(
      (word) => PAYPAL_URL_PATTERN.test(word.text) && !(typeof edgeZoneStartX === "number" && word.x0 >= edgeZoneStartX)
    );
    if (!urlWord) continue;

    let text = urlWord.text;
    const confidences = [urlWord.confidence];
    const contributingWords = [urlWord];

    const next = lines[i + 1];
    if (next && Array.isArray(next.words) && !isLabelEcho(next.text)) {
      const continuationWord = next.words.find(
        (word) => Math.abs(word.x0 - urlWord.x0) < PAYPAL_CONTINUATION_TOLERANCE_PX
      );
      if (continuationWord) {
        text += continuationWord.text;
        confidences.push(continuationWord.confidence);
        contributingWords.push(continuationWord);
      }
    }

    // Zeichenweise Konfidenz nur, wenn sie für ALLE beitragenden
    // Wörter vorliegt — sonst würde `text` und `symbols` nicht mehr
    // Zeichen für Zeichen übereinstimmen.
    const symbols = contributingWords.every((w) => Array.isArray(w.symbols))
      ? contributingWords.flatMap((w) => w.symbols)
      : undefined;

    return { text, confidence: Math.min(...confidences), symbols, bbox: boundingBoxOfWords(contributingWords) };
  }

  return null;
}

function findFieldValue(lines, labelVariants, edgeZoneStartX) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = matchLabel(line.text, labelVariants);
    if (!match.matched) continue;

    if (match.remainder) {
      const refined = refineWithWordPositions(
        { words: line.words, remainderText: match.remainder },
        match.label,
        line.confidence,
        edgeZoneStartX
      );
      return refined;
    }

    // Beschriftung steht allein in der Zeile — der Wert wird (falls
    // vorhanden) in der nächsten Zeile erwartet, sofern diese nicht
    // selbst eine bekannte Feldbeschriftung ist (dann gilt das Feld im
    // Screenshot als leer, statt versehentlich die nächste
    // Beschriftung als Wert zu übernehmen).
    const next = lines[i + 1];
    if (next && !isLabelEcho(next.text)) {
      if (Array.isArray(next.words) && next.words.length > 1) {
        const referenceGap = next.words[1].x0 - next.words[0].x1;
        const reconstructed = reconstructValueFromWords(next.words, 0, referenceGap, edgeZoneStartX);
        if (reconstructed) return reconstructed;
      }
      if (Array.isArray(next.words) && next.words.length === 1) {
        const word = next.words[0];
        return {
          text: next.text,
          confidence: next.confidence,
          symbols: Array.isArray(word.symbols) ? word.symbols : undefined,
          bbox: boundingBoxOfWords([word]),
        };
      }
      return { text: next.text, confidence: next.confidence };
    }

    // Die Beschriftung wurde eindeutig erkannt, aber es folgt kein
    // plausibler Wert (Zeile endet hier, oder die nächste Zeile ist
    // selbst wieder eine bekannte Beschriftung) — das Feld gilt damit
    // als im Screenshot bestätigt leer, nicht bloß "nicht gefunden".
    // Nur für Felder relevant, die diese Unterscheidung auswerten
    // (aktuell die IFK-ID, siehe `core/screenshot/
    // buildExtractionFields.js`); für alle anderen Felder verhält
    // sich das wie zuvor (leerer Text → `not_recognized`).
    return { text: "", confidence: line.confidence, confirmedEmpty: true };
  }

  return null;
}

/**
 * Ordnet die von der OCR erkannten Textzeilen den zehn benötigten
 * Feldern des festen humbee-Vorgangstyps zu — rein regelbasiert über
 * feste Feldbeschriftungen (`core/screenshot/ocrLabels.js`), keine
 * generative Interpretation. Liefert für jedes Feld eines von drei
 * Ergebnissen:
 * - `null` — die Beschriftung wurde nirgends gefunden (unbekannt, ob
 *   das Feld im Screenshot existiert).
 * - `{ text: "", confirmedEmpty: true, confidence }` — die
 *   Beschriftung wurde eindeutig gefunden, ihr folgt aber kein
 *   plausibler Wert (bestätigt leeres Feld).
 * - `{ text, confidence, symbols?, bbox? }` — ein gefundener Rohwert
 *   vor Validierung; `bbox` (Vereinigung der beitragenden Wort-Boxen)
 *   ist nur vorhanden, wenn alle beitragenden Wörter aus Tesseract
 *   Positionsdaten hatten.
 *
 * @param {{ text: string, confidence?: number, words?: { text: string, confidence: number, x0: number, y0: number, x1: number, y1: number, symbols?: { text: string, confidence: number }[] }[] }[]} lines
 * @returns {Record<string, { text: string, confidence?: number, symbols?: { text: string, confidence: number }[], bbox?: { x0: number, y0: number, x1: number, y1: number }, confirmedEmpty?: boolean } | null>}
 */
export function extractRawFieldsFromOcrLines(lines) {
  const normalizedLines = (Array.isArray(lines) ? lines : [])
    .map((line) => ({
      text: typeof line?.text === "string" ? line.text.trim() : "",
      confidence: typeof line?.confidence === "number" ? line.confidence : undefined,
      words: Array.isArray(line?.words) ? line.words : undefined,
    }))
    .filter((line) => line.text);

  const edgeZoneStartX = computeEdgeZoneStartX(normalizedLines);

  const rawFields = {};
  for (const [fieldKey, labelVariants] of Object.entries(OCR_FIELD_LABELS)) {
    rawFields[fieldKey] = findFieldValue(normalizedLines, labelVariants, edgeZoneStartX);
  }

  if (!rawFields.paypalUrl) {
    rawFields.paypalUrl = findPaypalUrlByPattern(normalizedLines, edgeZoneStartX);
  }

  return rawFields;
}
