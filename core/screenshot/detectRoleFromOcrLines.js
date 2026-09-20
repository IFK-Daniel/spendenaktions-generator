import { ROLE_KEYS } from "../materials/roleConfig.js";

// Erkennt den Wegbegleiter-Typ (Repräsentant, Botschafter, Beirat, …)
// aus dem Titel des humbee-Vorgangs. Im Screenshot steht der Typ an bis
// zu drei Stellen: in der Kopfzeile "<Typ> / <Nachname>, <Vorname>", in
// der Zeile darunter "<Typ>  <Nachname>, <Vorname>" und neben "Status".
// Fehlt die Kopfzeile im Ausschnitt, genügen die beiden anderen. Bewusst NUR solche Zeilen zählen
// (Typ am Zeilenanfang UND danach ein Name in der Form "Nachname,
// Vorname"): Der Hinweis "Mail "Willkommen als Botschafter" verschicken"
// und die Kategorie-Zeile "Wegbegleiter (Vorstand, Beirat, Kuratoren, …)"
// enthalten ebenfalls Typ-Wörter, dürfen aber nichts auslösen.
//
// Reihenfolge ist irrelevant, die Muster schließen sich gegenseitig aus.
const ROLE_PATTERNS = [
  [ROLE_KEYS.REPRESENTATIVE, /^repr[aäe]sentant(?:in)?\b/i],
  [ROLE_KEYS.AMBASSADOR, /^botschafter(?:in)?\b/i],
  [ROLE_KEYS.ECONOMIC_COUNCIL, /^wirtschaftsr(?:at|ates|ats|ät(?:in)?)\b/i],
  [ROLE_KEYS.EXPERT_COUNCIL, /^(?:fachr(?:at|ates|ats|ät(?:in)?)|fachliche[rs]?\s+r(?:at|ät(?:in)?))\b/i],
  [ROLE_KEYS.CURATOR, /^kurator(?:in|ium|iums)?\b/i],
  [ROLE_KEYS.ADVISORY_BOARD, /^beir(?:at|ats|ät(?:in)?)\w*\b/i],
];

// "Nachname, Vorname" (auch mehrteilig/mit Bindestrich).
const NAME_PATTERN = /[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*)*,\s*[\p{L}][\p{L}'’.-]*/u;

function stripLeadingNoise(text) {
  return text.replace(/^[^\p{L}\p{N}]+/u, "");
}

function stripMembershipPrefix(text) {
  return text.replace(/^mitglied\s+(?:des|im|der)\s+/i, "");
}

/**
 * @param {Array<{ text?: string }>} lines OCR-Zeilen (`runScreenshotOcr`).
 * @returns {string | null} Ein Schlüssel aus `ROLE_KEYS`, oder `null`
 *   wenn nichts oder Widersprüchliches erkannt wurde (dann darf die
 *   Rollenauswahl NICHT verändert werden).
 */
export function detectRoleFromOcrLines(lines) {
  const found = new Set();

  for (const line of Array.isArray(lines) ? lines : []) {
    const rawText = stripLeadingNoise(typeof line?.text === "string" ? line.text.trim() : "");
    if (!rawText) continue;

    // Dritte Fundstelle: Zeile "Status <Typ>" — dort steht der Typ neben
    // der Beschriftung "Status", ohne Namen dahinter.
    const statusMatch = rawText.match(/^status\s*[:\-]?\s+(.+)$/i);
    if (statusMatch) {
      const statusText = stripMembershipPrefix(statusMatch[1].trim());
      const hit = ROLE_PATTERNS.find(([, pattern]) => pattern.test(statusText));
      if (hit) found.add(hit[0]);
      continue;
    }

    const text = stripMembershipPrefix(rawText);

    for (const [roleKey, pattern] of ROLE_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;
      const remainder = text.slice(match[0].length).replace(/^[\s/|:-]+/, "");
      if (NAME_PATTERN.test(remainder)) found.add(roleKey);
      break;
    }
  }

  return found.size === 1 ? [...found][0] : null;
}
