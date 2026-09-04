/**
 * Modularer INHALT der Begleit-Anleitung „Hinweise zur Verwendung Deiner
 * Materialien" (siehe `core/materials/generateCompanionMaterialGuide.js`
 * für das Rendering). Bewusst als reine Datenstruktur getrennt vom
 * Rendering — weitere Materialien (künftig z. B. Urkunde, weitere
 * QR-Varianten) werden hier einfach als zusätzlicher Abschnitt
 * ergänzt, ohne dass am Renderer oder in `generator.js` etwas
 * geändert werden muss.
 *
 * KEIN personenbezogenes Dokument: kein Name, keine IFK-ID, keine
 * E-Mail-Adresse, keine Telefonnummer — dieser Inhalt ist für JEDEN
 * Wegbegleiter identisch (siehe `generateCompanionMaterialGuide.js`).
 *
 * Ansprache: durchgehend Du (Vorgabe).
 *
 * Jeder Abschnitt: `{ key, heading, paragraphs, steps? }`.
 * `paragraphs` sind einfache Fließtextabsätze (werden umgebrochen).
 * `steps` (optional) ist eine nummerierte Schritt-für-Schritt-Liste
 * (aktuell nur beim GiroCode, siehe unten) — als eigenes Feld statt in
 * `paragraphs` gemischt, damit der Renderer sie sichtbar als Liste
 * darstellen kann.
 */
export const COMPANION_MATERIAL_GUIDE_TITLE = "Hinweise zur Verwendung Deiner Materialien";

export const COMPANION_MATERIAL_GUIDE_SECTIONS = Object.freeze([
  Object.freeze({
    key: "flyerPrint",
    heading: "Flyer Druckerei",
    paragraphs: Object.freeze([
      "Diese Datei ist für die professionelle Produktion Deines Flyers gedacht. Sie enthält die für den Druck erforderliche Beschnittzugabe.",
      "Du kannst die PDF beispielsweise bei Flyeralarm oder einer Druckerei Deiner Wahl hochladen. Bitte die Datei nicht selbst beschneiden oder skalieren.",
      "Wenn das Bestellportal nach dem Endformat fragt: DIN A5, 148 × 210 mm. Die Datei selbst besitzt aufgrund der Beschnittzugabe 150 × 212 mm.",
      "Für einen wertigen Flyer empfehlen wir ein Papier mit etwa 170 g/m². Wenn Du eine nachhaltigere Variante bevorzugst, eignet sich beispielsweise Recyclingpapier mit dieser Grammatur; alternativ ist Bilderdruck matt eine klassische Wahl.",
    ]),
  }),
  Object.freeze({
    key: "flyerHome",
    heading: "Flyer Home",
    paragraphs: Object.freeze([
      "Diese Datei ist für den Ausdruck auf einem normalen DIN-A4-Drucker vorbereitet. Sie enthält zwei identische DIN-A5-Flyer nebeneinander.",
      "Drucke die PDF auf DIN A4, im Querformat, doppelseitig. Wenn Dein Drucker nicht randlos drucken kann, kannst Du die automatische Größenanpassung des Druckers verwenden. Dadurch wird der Flyer geringfügig kleiner, bleibt aber vollständig sichtbar.",
      "Duplex-Einstellung: „An der kurzen Kante wenden“. Je nach Drucker oder Betriebssystem kann diese Einstellung auch anders heißen, zum Beispiel „schmale Seite“.",
      "Danach das Blatt an den Schnittmarkierungen mittig teilen. So erhältst Du zwei zweiseitige DIN-A5-Flyer.",
      "Für den Ausdruck zu Hause empfehlen wir Papier mit etwa 160 g/m². Bitte prüfe vorher, welche Papierstärke Dein Drucker unterstützt.",
    ]),
  }),
  Object.freeze({
    key: "paypalQr",
    heading: "PayPal-QR-Code",
    paragraphs: Object.freeze([
      "Der PayPal-QR-Code führt direkt zu Deiner persönlichen PayPal-Spendenaktion.",
      "Du kannst ihn beispielsweise verwenden: auf eigenen Materialien, in Präsentationen, digital, bei Veranstaltungen.",
      "Nach dem Scannen öffnet sich die persönliche PayPal-Spendenaktion.",
    ]),
  }),
  Object.freeze({
    key: "giroCode",
    heading: "GiroCode",
    paragraphs: Object.freeze([
      "Viele Menschen versuchen, einen GiroCode mit der normalen Kamera-App zu scannen. Das funktioniert je nach Gerät beziehungsweise Banking-App nicht wie erwartet.",
      "Der GiroCode enthält die Überweisungsdaten für die Banking-App. Typischer Ablauf:",
    ]),
    steps: Object.freeze([
      "Banking-App öffnen.",
      "Funktion für Überweisung wählen.",
      "Dort „QR-Code scannen“, „Fotoüberweisung“, „GiroCode“ oder vergleichbare Funktion auswählen.",
      "GiroCode scannen.",
      "Überweisungsdaten werden automatisch übernommen.",
      "Daten prüfen.",
      "Betrag eingeben beziehungsweise bestätigen, sofern erforderlich.",
      "Überweisung freigeben.",
    ]),
    closingParagraphs: Object.freeze([
      "Wichtig: Der Verwendungszweck enthält die persönliche IFK-ID und ermöglicht die interne Zuordnung.",
      "Wenn jemand sagt „Der QR-Code funktioniert nicht“, liegt es häufig daran, dass er mit der normalen Smartphone-Kamera statt innerhalb der Banking-App gescannt wurde.",
    ]),
  }),
]);
