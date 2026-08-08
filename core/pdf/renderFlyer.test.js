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
