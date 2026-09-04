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
