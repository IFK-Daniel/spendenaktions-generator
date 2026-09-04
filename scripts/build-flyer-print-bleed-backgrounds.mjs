import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

/**
 * Schritt 2/2 der Druckerei-Beschnitt-Erzeugung: baut aus den vier
 * Kanten-Streifenbildern (`scripts/extract-flyer-bleed-strips.py`,
 * unter `artifacts/flyer-bleed-strips/<name>/{top,bottom,left,right}.png`)
 * und dem unveränderten 148×210mm-Original-Master die finale
 * 150×212mm-Druckerei-Hintergrunddatei.
 *
 * Verbindliche Grundlage: `Medien/flyer_a5_mass.pdf` (Flyeralarm-
 * Datenblatt "Flyer DIN A5, Hochformat"), per PyMuPDF verifiziert:
 *   Endformat (B) = 148 × 210 mm, Datenformat (A) = 150 × 212 mm,
 *   Beschnittzugabe (x) = 1 mm umlaufend, Sicherheitsabstand (z) = 4 mm.
 *
 * Bewusst mit pdf-lib (statt PyMuPDFs `show_pdf_page`) umgesetzt: das
 * ist exakt derselbe Einbettungsmechanismus (`embedPage`/`drawPage`,
 * bottom-left-Ursprung), den `core/pdf/renderFlyer.js`
 * (`addBackgroundPage`) zur Laufzeit ohnehin verwendet — keine
 * Geometrie-Unsicherheiten durch ein zweites Werkzeug. Das originale
 * 148×210mm-Artwork wird UNSKALIERT, 1mm versetzt eingebettet (oben
 * auf den vier Streifenbildern, die nur im äußeren 1mm-Beschnittring
 * sichtbar bleiben) — keine personenbezogenen Inhalte, QR-Codes oder
 * Texte liegen im Beschnitt.
 *
 * Aufruf: node scripts/build-flyer-print-bleed-backgrounds.mjs
 */

const MM_TO_PT = 72 / 25.4;
const BLEED_MM = 1;
const TRIM_W_MM = 148;
const TRIM_H_MM = 210;
const DATA_W_MM = TRIM_W_MM + 2 * BLEED_MM;
const DATA_H_MM = TRIM_H_MM + 2 * BLEED_MM;

const STRIPS_DIR = new URL("../artifacts/flyer-bleed-strips/", import.meta.url);

const SOURCES = [
  ["templates/flyer-representative-female-du-front/background.pdf", "female-du", "templates/flyer-representative-female-du-print/background.pdf"],
  ["templates/flyer-representative-female-sie-front/background.pdf", "female-sie", "templates/flyer-representative-female-sie-print/background.pdf"],
  ["templates/flyer-representative-male-du-front/background.pdf", "male-du", "templates/flyer-representative-male-du-print/background.pdf"],
  ["templates/flyer-representative-male-sie-front/background.pdf", "male-sie", "templates/flyer-representative-male-sie-print/background.pdf"],
  ["templates/flyer-shared-back/background.pdf", "shared-back", "templates/flyer-shared-back-print/background.pdf"],
];

const ROOT = new URL("../", import.meta.url);

async function buildOne(srcRel, name, dstRel) {
  const srcBytes = readFileSync(new URL(srcRel, ROOT));
  const srcDoc = await PDFDocument.load(srcBytes);
  const srcPage = srcDoc.getPage(0);
  const srcWidthPt = srcPage.getWidth();
  const srcHeightPt = srcPage.getHeight();
  const expectedWidthPt = TRIM_W_MM * MM_TO_PT;
  const expectedHeightPt = TRIM_H_MM * MM_TO_PT;
  if (Math.abs(srcWidthPt - expectedWidthPt) > 0.5 || Math.abs(srcHeightPt - expectedHeightPt) > 0.5) {
    throw new Error(`${srcRel}: erwartet ${TRIM_W_MM}x${TRIM_H_MM}mm, gefunden ${srcWidthPt}x${srcHeightPt}pt`);
  }

  const outDoc = await PDFDocument.create();
  const outWidthPt = DATA_W_MM * MM_TO_PT;
  const outHeightPt = DATA_H_MM * MM_TO_PT;
  const page = outDoc.addPage([outWidthPt, outHeightPt]);

  const bleedPt = BLEED_MM * MM_TO_PT;
  const stripDir = new URL(`${name}/`, STRIPS_DIR);

  async function drawStrip(fileName, xPt, yPt, widthPt, heightPt) {
    const bytes = readFileSync(new URL(fileName, stripDir));
    const image = await outDoc.embedPng(bytes);
    page.drawImage(image, { x: xPt, y: yPt, width: widthPt, height: heightPt });
  }

  // Links/rechts über die volle neue Höhe (deckt die vier Ecken ab)…
  await drawStrip("left.png", 0, 0, bleedPt, outHeightPt);
  await drawStrip("right.png", outWidthPt - bleedPt, 0, bleedPt, outHeightPt);
  // …dann oben/unten, nur über die Trim-Breite.
  await drawStrip("top.png", bleedPt, outHeightPt - bleedPt, outWidthPt - 2 * bleedPt, bleedPt);
  await drawStrip("bottom.png", bleedPt, 0, outWidthPt - 2 * bleedPt, bleedPt);

  // Original-Vektor-Inhalt unskaliert, exakt 1mm versetzt, obendrauf.
  const embedded = await outDoc.embedPage(srcPage);
  page.drawPage(embedded, { x: bleedPt, y: bleedPt, width: srcWidthPt, height: srcHeightPt });

  const outBytes = await outDoc.save();
  const dstUrl = new URL(dstRel, ROOT);
  mkdirSync(new URL(".", dstUrl), { recursive: true });
  writeFileSync(dstUrl, outBytes);
  console.log(`${dstRel} <- ${srcRel}  (${DATA_W_MM}x${DATA_H_MM}mm, ${(outBytes.length / 1024).toFixed(0)} KB)`);
}

for (const [srcRel, name, dstRel] of SOURCES) {
  await buildOne(srcRel, name, dstRel);
}
