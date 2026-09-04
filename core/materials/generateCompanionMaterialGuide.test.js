import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  generateCompanionMaterialGuide,
  COMPANION_MATERIAL_GUIDE_FILENAME,
  COMPANION_MATERIAL_GUIDE_KEY,
} from "./generateCompanionMaterialGuide.js";
import { loadFontFile } from "../pdf/loadFontFile.js";
import { COMPANION_MATERIAL_GUIDE_SECTIONS } from "./companionMaterialGuideContent.js";

const nodeDeps = { loadFontBytes: loadFontFile };

test("liefert die feste, nicht personenbezogene Datei ohne Namen/IFK-ID im Dateinamen", async () => {
  const result = await generateCompanionMaterialGuide({ deps: nodeDeps });
  assert.equal(result.filename, "Hinweise_zur_Verwendung_der_Materialien.pdf");
  assert.equal(result.filename, COMPANION_MATERIAL_GUIDE_FILENAME);
  assert.equal(result.key, COMPANION_MATERIAL_GUIDE_KEY);
  assert.equal(result.category, "guide");
  assert.equal(result.mimeType, "application/pdf");
  assert.ok(result.size > 0);
});

test("erzeugt ein gültiges, mehrseitiges PDF", async () => {
  const result = await generateCompanionMaterialGuide({ deps: nodeDeps });
  const buf = await result.content.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  assert.ok(doc.getPageCount() >= 1);
});

test("wirft ohne deps.loadFontBytes", async () => {
  await assert.rejects(() => generateCompanionMaterialGuide({}), /loadFontBytes/);
});

test("Inhalt enthält keine personenbezogenen Platzhalter (Name/IFK-ID/E-Mail/Telefon)", () => {
  const allText = COMPANION_MATERIAL_GUIDE_SECTIONS.flatMap((section) => [
    ...(section.paragraphs ?? []),
    ...(section.steps ?? []),
    ...(section.closingParagraphs ?? []),
  ]).join(" ");
  for (const forbidden of ["{firstName}", "{lastName}", "{ifkId}", "{email}", "{phone}", "undefined", "null"]) {
    assert.equal(allText.includes(forbidden), false, `Inhalt darf "${forbidden}" nicht enthalten`);
  }
});

test("enthält alle vier vorgegebenen Abschnitte (modular, für künftige Ergänzungen erweiterbar)", () => {
  const keys = COMPANION_MATERIAL_GUIDE_SECTIONS.map((s) => s.key);
  assert.deepEqual(keys, ["flyerPrint", "flyerHome", "paypalQr", "giroCode"]);
});

test("GiroCode-Abschnitt nennt die im Home-Sheet ermittelte Duplex-Einstellung", () => {
  const flyerHome = COMPANION_MATERIAL_GUIDE_SECTIONS.find((s) => s.key === "flyerHome");
  const joined = flyerHome.paragraphs.join(" ");
  assert.match(joined, /kurzen Kante wenden/);
});

test("Home-Anleitung nennt zusätzlich eine alltagssprachliche Bezeichnung (z. B. 'schmale Seite') für die Duplex-Einstellung", () => {
  const flyerHome = COMPANION_MATERIAL_GUIDE_SECTIONS.find((s) => s.key === "flyerHome");
  const joined = flyerHome.paragraphs.join(" ");
  assert.match(joined, /schmale Seite/);
});

test("Home-Anleitung erlaubt die automatische Größenanpassung des Druckers, statt 100 % vorzuschreiben", () => {
  const flyerHome = COMPANION_MATERIAL_GUIDE_SECTIONS.find((s) => s.key === "flyerHome");
  const joined = flyerHome.paragraphs.join(" ");
  assert.match(joined, /automatische Größenanpassung/);
  assert.equal(/100\s?%/.test(joined), false, "Anleitung darf keine pauschale 100-%-Pflicht mehr nennen");
  assert.equal(/tatsächliche(r)? Größe/.test(joined), false, "Anleitung darf 'tatsächliche Größe' nicht mehr fordern");
});

test("Home-Anleitung empfiehlt ca. 160 g/m² Papier für den Ausdruck zu Hause", () => {
  const flyerHome = COMPANION_MATERIAL_GUIDE_SECTIONS.find((s) => s.key === "flyerHome");
  const joined = flyerHome.paragraphs.join(" ");
  assert.match(joined, /160\s?g\/m²/);
});

test("Druckerei-Anleitung empfiehlt ca. 170 g/m² Papier", () => {
  const flyerPrint = COMPANION_MATERIAL_GUIDE_SECTIONS.find((s) => s.key === "flyerPrint");
  const joined = flyerPrint.paragraphs.join(" ");
  assert.match(joined, /170\s?g\/m²/);
});
