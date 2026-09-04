import {
  REPRESENTATIVE_FLYER_FRONT_FIELDS,
  REPRESENTATIVE_FLYER_FRONT_FONTS,
} from "./representativeFlyerFrontBase.js";

/**
 * Gemeinsame Seiten-Definition für die Repräsentanten-Flyer-VORDERSEITEN
 * in der DRUCKEREI-Fassung (mit echter Beschnittzugabe) — Feld- und
 * Schrift-Definitionen sind IDENTISCH zur Home-/Bildschirm-Fassung
 * (`representativeFlyerFrontBase.js`, ein einziger Koordinatensatz,
 * relativ zur Trim-Kante) und werden hier unverändert wiederverwendet.
 *
 * Verbindliche Grundlage: `Medien/flyer_a5_mass.pdf` (Flyeralarm-
 * Datenblatt "Flyer DIN A5, Hochformat"), per PyMuPDF verifiziert:
 *   Endformat (B) = 148 × 210 mm
 *   Datenformat (A) = 150 × 212 mm
 *   Beschnittzugabe (x) = 1 mm umlaufend
 *   Sicherheitsabstand (z) = 4 mm
 *
 * `sourceBleedMm = 1` UND `outputBleedMm = 1`: die zugehörigen
 * `background.pdf`-Dateien (`templates/flyer-representative-*-print/`,
 * `templates/flyer-shared-back-print/`) sind selbst bereits
 * 150×212mm groß und enthalten echten Anschnitt (siehe
 * `scripts/build-flyer-print-bleed-backgrounds.py`) — die bestehende,
 * unveränderte Bleed-Logik in `core/pdf/renderFlyer.js`
 * (`addBackgroundPage`, `trimCoordinateToPdfPoint`) platziert damit
 * Hintergrund UND alle Felder automatisch exakt 1mm versetzt, ohne dass
 * sich an den (unverändert relativ zur Trim-Kante angegebenen)
 * Feldkoordinaten irgendetwas ändert.
 *
 * WICHTIG — das 148×210mm-Trimformat wurde NICHT auf 150×212mm
 * skaliert (das hätte alle Positionen verschoben). Stattdessen wurde
 * das unveränderte Original-Artwork unskaliert 1mm versetzt in die
 * größere Seite eingebettet; die zusätzliche 1mm-Beschnittzugabe
 * entstand durch randnahe Farbfortsetzung (Kanten-Clamping der
 * Randpixel), siehe Kommentar im Erzeugungsskript. Keine
 * personenbezogenen Inhalte, QR-Codes oder Texte liegen im Beschnitt —
 * dort ausschließlich fortgesetzte Hintergrundfläche.
 *
 * SICHERHEITSABSTAND (4 mm) — GEPRÜFT, NICHT SELBST KORRIGIERT (siehe
 * Vorgabe: nur dokumentieren, ggf. Aufgabe für den Grafiker):
 * Die vier Vorderseiten-Master verletzen den 4mm-Sicherheitsabstand am
 * unteren Rand: die Kontaktzeile "info@its-for-kids.de -
 * www.its-for-kids.de" reicht bis y≈208.96mm (Trim-Kante 210mm), also
 * nur ~1.0mm Abstand statt 4mm. Die gemeinsame Rückseite verletzt ihn
 * am oberen Rand: die Überschrift "Wir schaffen Chancen für…" beginnt
 * bereits bei y≈0.96mm. Beide Fälle betreffen ausschließlich
 * statischen, vom Grafiker gelieferten Text — nicht durch dieses
 * Projekt eigenmächtig verschoben.
 */
export const REPRESENTATIVE_FLYER_PRINT_PAGE = Object.freeze({
  trimWidthMm: 148,
  trimHeightMm: 210,
  sourceBleedMm: 1,
  outputBleedMm: 1,
});

export { REPRESENTATIVE_FLYER_FRONT_FIELDS as REPRESENTATIVE_FLYER_PRINT_FIELDS };
export { REPRESENTATIVE_FLYER_FRONT_FONTS as REPRESENTATIVE_FLYER_PRINT_FONTS };

/**
 * Baut eine vollständige Druckerei-Vorderseiten-Template-Config für
 * eine Geschlecht-/Ansprache-Variante. Analog zu
 * `buildRepresentativeFlyerFrontTemplate` in `representativeFlyerFrontBase.js`,
 * nur mit Beschnitt-Seitenmaßen.
 *
 * @param {{ key: string, label: string, background: URL }} params
 * @returns {Readonly<object>}
 */
export function buildRepresentativeFlyerPrintTemplate({ key, label, background }) {
  return Object.freeze({
    key,
    label,
    background,
    page: REPRESENTATIVE_FLYER_PRINT_PAGE,
    fonts: REPRESENTATIVE_FLYER_FRONT_FONTS,
    legacyContentCovers: Object.freeze([]),
    fields: REPRESENTATIVE_FLYER_FRONT_FIELDS,
  });
}
