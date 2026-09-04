import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFArray, decodePDFRawStream } from "pdf-lib";
import { renderFlyer } from "./renderFlyer.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { mmToPt } from "./units.js";
import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../../templates/flyer-home-front/template.config.js";
import { flyerFemalePrintFrontTemplate } from "../../templates/flyer-female-print-front/template.config.js";
import { flyerFemaleHomeFrontTemplate } from "../../templates/flyer-female-home-front/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../../templates/certificate-representative-male/template.config.js";
import { certificateRepresentativeFemaleTemplate } from "../../templates/certificate-representative-female/template.config.js";
import { extractPdfText } from "./extractPdfText.js";

const nodeDeps = { loadTemplateAssets };

// 1x1-Pixel weißes PNG als Platzhalter für Foto/QR-Codes in Tests.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function tinyImageAssets() {
  const bytes = Buffer.from(TINY_PNG_BASE64, "base64");
  return {
    photo: { bytes, mimeType: "image/png" },
    qrPaypal: { bytes, mimeType: "image/png" },
    qrGiro: { bytes, mimeType: "image/png" },
  };
}

function sampleTextValues(overrides = {}) {
  return {
    name: "Kim Yu",
    region: "München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
    ...overrides,
  };
}

test("renderFlyer wirft ohne deps.loadTemplateAssets (kein impliziter Node-Default mehr, siehe Browser-Kompatibilität)", async () => {
  await assert.rejects(
    () =>
      renderFlyer({
        templateConfig: flyerPrintFrontTemplate,
        textValues: sampleTextValues(),
        imageAssets: tinyImageAssets(),
      }),
    /deps\.loadTemplateAssets/
  );
});

test("renderFlyer erzeugt aus der echten Print-Vorlage ein gültiges PDF mit korrekter Seitengröße (inkl. 3mm Beschnitt)", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 1);
  assert.deepEqual(warnings, []);

  const page = result.getPage(0);
  const { width, height } = page.getSize();
  // 154 x 216 mm (148x210 Trim + 3mm Beschnitt rundum) in pt, Toleranz für Rundung.
  assert.ok(Math.abs(width - (154 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (216 / 25.4) * 72) < 0.5);
});

test("renderFlyer erzeugt aus der Home-Vorlage eine Seite ohne Beschnitt (148x210mm)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: flyerHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const result = await PDFDocument.load(bytes);
  const page = result.getPage(0);
  const { width, height } = page.getSize();
  assert.ok(Math.abs(width - (148 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (210 / 25.4) * 72) < 0.5);
});

test("renderFlyer wirft bei fehlendem Bild-Asset für ein Bildfeld", async () => {
  await assert.rejects(
    () =>
      renderFlyer({
        templateConfig: flyerPrintFrontTemplate,
        textValues: sampleTextValues(),
        imageAssets: {},
        deps: nodeDeps,
      }),
    /fehlendes Bild-Asset/
  );
});

test("renderFlyer akzeptiert leere textValues (keine Pflichtprüfung, leere Zeichenkette statt Fehler)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: {},
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
});

test("ein sehr langer Regionsname im Fließtext erzeugt eine warning statt stillschweigend zu überlaufen", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues({
      region: "Landkreis Mecklenburgische Seenplatte",
      regionInParagraph: "Landkreis Mecklenburgische Seenplatte",
    }),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
  const fieldKeys = warnings.map((w) => w.fieldKey);
  assert.ok(fieldKeys.includes("regionInParagraph"), `erwartete Warnung für regionInParagraph, erhalten: ${fieldKeys}`);
});

test("ein extrem langer Name erzeugt keine Warnung (Auto-Shrink + 2-zeiliger Umbruch reichen)", async () => {
  const { warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues({ name: "Maximilian Bartholomäus-Schweighofer" }),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  const fieldKeys = warnings.map((w) => w.fieldKey);
  assert.ok(!fieldKeys.includes("name"), `unerwartete Warnung für name: ${JSON.stringify(warnings)}`);
});

test("ein manueller photoCrop am Bild-Asset wird berücksichtigt (kein Fehler, PDF entsteht weiterhin)", async () => {
  const assets = tinyImageAssets();
  assets.photo.crop = { zoom: 2, offsetX: 0.5, offsetY: -0.5 };
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
});

test("Home- und Druckerei-Vorlage erzeugen mit identischem photoCrop-Asset jeweils gültige PDFs (derselbe Ausschnitt wird durchgereicht)", async () => {
  const assets = tinyImageAssets();
  assets.photo.crop = { zoom: 1.8, offsetX: -1, offsetY: 1 };

  const print = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });
  const home = await renderFlyer({
    templateConfig: flyerHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });

  assert.ok(print.bytes.length > 0);
  assert.ok(home.bytes.length > 0);
});

// Dekodiert den (ggf. Flate-komprimierten) Content-Stream einer Seite zu
// PDF-Operatoren als Text — erlaubt es, die tatsächlich geschriebene
// "Tm"-Textmatrix (u. a. die Y-Position der Baseline) zu prüfen, ohne
// dafür ein separates PDF-Parsing-Tool einzuführen.
async function decodePageContent(bytes) {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  const contentsRef = page.node.Contents();
  const streamRefs = doc.context.lookup(contentsRef) instanceof PDFArray
    ? doc.context.lookup(contentsRef).asArray()
    : [contentsRef];

  let text = "";
  for (const ref of streamRefs) {
    const stream = doc.context.lookup(ref);
    text += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1") + "\n";
  }
  return text;
}

// Extrahiert die Y-Komponente der letzten "Tm"-Textmatrix vor einem "Tj"
// im Content-Stream (reicht für die hier getesteten Single-Field-PDFs).
function extractTextMatrixY(content) {
  const match = content.match(/1 0 0 1 [\d.]+ ([\d.]+) Tm/);
  return match ? Number(match[1]) : null;
}

test("Urkunde: verticalOffsetMm aus der Template-Config verschiebt die Baseline exakt um mmToPt(verticalOffsetMm) nach oben", async () => {
  const withoutOffset = {
    ...certificateRepresentativeMaleTemplate,
    fields: {
      ...certificateRepresentativeMaleTemplate.fields,
      name: { ...certificateRepresentativeMaleTemplate.fields.name, verticalOffsetMm: 0 },
    },
  };

  const { bytes: bytesWithout } = await renderFlyer({
    templateConfig: withoutOffset,
    textValues: { name: "Kim Yu" },
    imageAssets: {},
    deps: nodeDeps,
  });
  const { bytes: bytesWith } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Kim Yu" },
    imageAssets: {},
    deps: nodeDeps,
  });

  const yWithout = extractTextMatrixY(await decodePageContent(bytesWithout));
  const yWith = extractTextMatrixY(await decodePageContent(bytesWith));

  assert.ok(yWithout !== null && yWith !== null, "Tm-Matrix sollte im Content-Stream gefunden werden");
  const expectedOffsetPt = mmToPt(certificateRepresentativeMaleTemplate.fields.name.verticalOffsetMm);
  assert.ok(
    Math.abs(yWith - yWithout - expectedOffsetPt) < 0.01,
    `erwarteter Y-Versatz ${expectedOffsetPt}pt, tatsächlich ${yWith - yWithout}pt`
  );
});

test("Urkunde: männliche und weibliche Vorlage verwenden denselben verticalOffsetMm-Korrekturwert", () => {
  assert.equal(
    certificateRepresentativeFemaleTemplate.fields.name.verticalOffsetMm,
    certificateRepresentativeMaleTemplate.fields.name.verticalOffsetMm
  );
  assert.ok(certificateRepresentativeMaleTemplate.fields.name.verticalOffsetMm > 0);
});

test("Urkunde: Name bleibt bei allen vier Testnamen horizontal zentriert (align: 'center')", async () => {
  const names = ["Daniel Feigenbutz", "Kim Yu", "Alexandra Mazur", "Maximilian Bartholomäus-Schweighofer"];
  for (const name of names) {
    const { bytes } = await renderFlyer({
      templateConfig: certificateRepresentativeMaleTemplate,
      textValues: { name },
      imageAssets: {},
      deps: nodeDeps,
    });
    const content = await decodePageContent(bytes);
    // Bei align:"center" hängt die gezeichnete X-Position von der Textbreite
    // ab (siehe placeMultiLineText.js) — wir prüfen daher indirekt: die
    // X-Koordinate der Tm-Matrix darf nie am linken Rand der Box liegen
    // (xMm=1.176mm ≈ 3.33pt), da der Name sonst nicht zentriert wäre.
    const xMatch = content.match(/1 0 0 1 ([\d.]+) [\d.]+ Tm/);
    assert.ok(xMatch, `Tm-Matrix nicht gefunden für "${name}"`);
    assert.ok(Number(xMatch[1]) > 10, `Name "${name}" scheint nicht zentriert (x=${xMatch[1]})`);
  }
});

test("Urkunde: langer Name mit Auto-Shrink erzeugt keine Warning (kein fehlerhafter Output)", async () => {
  const { warnings } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Maximilian Bartholomäus-Schweighofer" },
    imageAssets: {},
    deps: nodeDeps,
  });
  assert.deepEqual(warnings, []);
});

test("Urkunde: weibliche Vorlage rendert ohne Fehler und ohne Warnings", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: certificateRepresentativeFemaleTemplate,
    textValues: { name: "Maximiliane Bartholomäus-Schweighofer" },
    imageAssets: {},
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
  assert.deepEqual(warnings, []);
});

test("Urkunde: optimierte Hintergrundgrafik bleibt deutlich unter 1MB, Seitengröße bleibt A4 (Mailgrößen-Optimierung, siehe attachment-size-analysis.md)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Daniel Feigenbutz" },
    imageAssets: {},
    deps: nodeDeps,
  });
  // Regressionsschutz gegen versehentliches Zurücksetzen der
  // Paletten-Optimierung (`scripts/optimize-template-backgrounds.py`):
  // vor der Optimierung lag die Urkunde bei ca. 1,32MB. Schwelle bewusst
  // NICHT so eng wie kurzzeitig (< 900 KB), weil das zusätzliche
  // Font-Subsetting (`embedFont(..., { subset: true })`), das damals
  // zu dieser kleineren Zahl beitrug, wegen eines schweren
  // Text-Korruptions-Bugs wieder entfernt wurde (siehe
  // `core/pdf/renderFlyer.js`, `embedFonts()`, und
  // `artifacts/pdf-regression/`) — Dokumentintegrität hat Vorrang vor
  // Dateigröße.
  assert.ok(bytes.length < 1_100_000, `Urkunde ist ${bytes.length} Byte groß, erwartet < 1100000 (Hintergrund-Optimierung wirkt weiterhin)`);

  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  // Seitengröße aus der Template-Config (297.127083 x 419.893732mm) —
  // unverändert gegenüber der Größenoptimierung, die ausschließlich die
  // Bildkodierung des Hintergrunds ändert, keine Geometrie.
  assert.ok(Math.abs(width - mmToPt(297.127083)) < 1, `Breite ${width}pt weicht von der Template-Trimgröße ab`);
  assert.ok(Math.abs(height - mmToPt(419.893732)) < 1, `Höhe ${height}pt weicht von der Template-Trimgröße ab`);
});

// ---------------------------------------------------------------------------
// Text-INTEGRITÄT (nicht nur "PDF lädt ohne Exception") — Regressionsschutz
// gegen den `embedFont(..., { subset: true })`-Bug: Name/Telefon/E-Mail
// wurden dabei auf einzelne Buchstaben reduziert (z. B. "Daniel Feigenbutz"
// -> "b"), obwohl alle bisherigen Tests (Seitengröße, keine Warnings,
// Dateigröße) weiterhin grün blieben. Diese Tests extrahieren den
// TATSÄCHLICHEN Text via `pdfjs-dist` (siehe `extractPdfText.js`) und
// prüfen, dass der dynamische Inhalt vollständig und unverstümmelt im
// PDF steht.
// ---------------------------------------------------------------------------

test("Text-Integrität (Flyer): Name, Region, Telefon und E-Mail erscheinen vollständig im PDF-Text (kein Glyphen-/Subsetting-Bug)", async () => {
  const textValues = {
    name: "Daniel Feigenbutz",
    region: "Düsseldorf",
    regionInParagraph: "Düsseldorf",
    phone: "015233795099",
    email: "d.feigenbutz@its-for-kids.de",
  };
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues,
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const [pageText] = await extractPdfText(bytes);
  assert.match(pageText, /Daniel Feigenbutz/, "Name muss vollständig erscheinen, nicht nur ein einzelnes Zeichen");
  assert.match(pageText, /Düsseldorf/, "Region muss vollständig erscheinen");
  assert.match(pageText, /015233795099/, "Telefonnummer muss vollständig und zusammenhängend erscheinen");
  assert.match(pageText, /d\.feigenbutz@its-for-kids\.de/, "E-Mail-Adresse muss vollständig erscheinen");
});

test("Text-Integrität (Flyer): funktioniert auch mit Umlauten/Sonderzeichen im Namen (kritischer Fall für Font-Subsetting)", async () => {
  const textValues = {
    name: "Maximilian Bartholomäus-Schweighofer",
    region: "München",
    regionInParagraph: "München",
    phone: "089 12345678",
    email: "m.bartholomaeus-schweighofer@example.com",
  };
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues,
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const [pageText] = await extractPdfText(bytes);
  assert.match(pageText, /Maximilian Bartholomäus-Schweighofer/);
});

test("Text-Integrität (Urkunde): langer Name mit Umlauten und Bindestrich erscheint vollständig im Namensbalken", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Maximilian Bartholomäus-Schweighofer" },
    imageAssets: {},
    deps: nodeDeps,
  });

  const [pageText] = await extractPdfText(bytes);
  assert.match(
    pageText,
    /Maximilian Bartholomäus-Schweighofer/,
    "Name muss vollständig im Namensbalken erscheinen, kein einzelnes Glyphen-Fragment (z. B. nur 'b')"
  );
});

test("Text-Integrität (Urkunde): kurzer Name erscheint vollständig (kein Fragment)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Daniel Feigenbutz" },
    imageAssets: {},
    deps: nodeDeps,
  });

  const [pageText] = await extractPdfText(bytes);
  assert.match(pageText, /Daniel Feigenbutz/);
  // Regressionsschutz gegen genau den beobachteten Bug: der Name-Text
  // im extrahierten PDF-Text darf nicht auf ein einzelnes Zeichen
  // reduziert sein.
  const nameMatch = pageText.match(/\bDaniel\b[^\n]*\bFeigenbutz\b/);
  assert.ok(nameMatch, "vollständiger Name nicht im extrahierten Text gefunden");
});

test("Flyer weiblich (Druckerei): korrekte Seitengröße (kein Beschnitt im Master, siehe Template-Kommentar), keine Warnungen", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: flyerFemalePrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 1);
  assert.deepEqual(warnings, []);

  const page = result.getPage(0);
  const { width, height } = page.getSize();
  // Neuer Master hat gar keinen Anschnitt (siehe Template-Kommentar) —
  // anders als beim männlichen Pendant ist die Druckerei-Fassung hier
  // (noch) 148x210mm statt 154x216mm.
  assert.ok(Math.abs(width - (148 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (210 / 25.4) * 72) < 0.5);
});

test("Flyer weiblich (Home): Seite ohne Beschnitt (148x210mm)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: flyerFemaleHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const result = await PDFDocument.load(bytes);
  const page = result.getPage(0);
  const { width, height } = page.getSize();
  assert.ok(Math.abs(width - (148 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (210 / 25.4) * 72) < 0.5);
});

test("Flyer weiblich: kein 'regionInParagraph'-Feld mehr (Übergangslösung entfällt laut Vorgabe vollständig)", () => {
  assert.equal(flyerFemalePrintFrontTemplate.fields.regionInParagraph, undefined);
  assert.equal(flyerFemaleHomeFrontTemplate.fields.regionInParagraph, undefined);
});

test("Flyer weiblich: sehr langer Name/Region/E-Mail erzeugen keine Warnung (kein zweites, kollisionsanfälliges Regionsfeld mehr)", async () => {
  const { warnings } = await renderFlyer({
    templateConfig: flyerFemalePrintFrontTemplate,
    textValues: sampleTextValues({
      name: "Maximilian Bartholomäus-Schweighofer",
      region: "Landkreis Mecklenburgische Seenplatte",
      email: "maximilian.bartholomaeus-schweighofer@stiftung-example.de",
    }),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  assert.deepEqual(warnings, []);
});

test("Flyer weiblich: Druckerei- und Home-Vorlage verwenden dieselben Feld-Koordinaten UND denselben Beschnitt (Master ohne jeden Anschnitt, siehe Template-Kommentar)", () => {
  assert.deepEqual(flyerFemalePrintFrontTemplate.fields, flyerFemaleHomeFrontTemplate.fields);
  assert.equal(flyerFemalePrintFrontTemplate.page.outputBleedMm, 0);
  assert.equal(flyerFemaleHomeFrontTemplate.page.outputBleedMm, 0);
});

test("Flyer weiblich und männlich: identische Trim-Seitengröße (148x210mm)", () => {
  assert.equal(flyerFemalePrintFrontTemplate.page.trimWidthMm, flyerPrintFrontTemplate.page.trimWidthMm);
  assert.equal(flyerFemalePrintFrontTemplate.page.trimHeightMm, flyerPrintFrontTemplate.page.trimHeightMm);
  // QR-Größe unterscheidet sich bewusst (weiblicher Master: 21x21mm laut
  // aktueller Koordinatenliste, männlicher Master weiterhin 20x20mm) —
  // beide Werte stammen direkt aus der jeweiligen, unabhängig geprüften
  // Grafiker-Vorgabe für den jeweiligen Master, siehe Template-Configs.
  assert.equal(flyerFemalePrintFrontTemplate.fields.qrPaypal.widthMm, 21);
  assert.equal(flyerFemalePrintFrontTemplate.fields.qrGiro.widthMm, 21);
});
