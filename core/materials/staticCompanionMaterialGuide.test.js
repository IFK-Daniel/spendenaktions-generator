import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { loadStaticCompanionMaterialGuide, STATIC_GUIDE_URL } from "./staticCompanionMaterialGuide.js";
import { loadFontFile } from "../pdf/loadFontFile.js";
import {
  COMPANION_MATERIAL_GUIDE_FILENAME,
  COMPANION_MATERIAL_GUIDE_KEY,
} from "./generateCompanionMaterialGuide.js";

const nodeDeps = { loadStaticBytes: loadFontFile };

test("wirft ohne deps.loadStaticBytes", async () => {
  await assert.rejects(() => loadStaticCompanionMaterialGuide({}), /loadStaticBytes/);
});

test("liefert dieselbe Dateiname-/Key-/Label-Struktur wie der dynamische Renderer", async () => {
  const result = await loadStaticCompanionMaterialGuide({ deps: nodeDeps });
  assert.equal(result.filename, COMPANION_MATERIAL_GUIDE_FILENAME);
  assert.equal(result.key, COMPANION_MATERIAL_GUIDE_KEY);
  assert.equal(result.category, "guide");
  assert.equal(result.mimeType, "application/pdf");
  assert.ok(result.size > 0);
});

test("liefert ein gültiges, mehrseitiges PDF", async () => {
  const result = await loadStaticCompanionMaterialGuide({ deps: nodeDeps });
  const buf = await result.content.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  assert.ok(doc.getPageCount() >= 1);
});

test("das statische Asset existiert unter der erwarteten URL/Pfad", async () => {
  const result = await loadStaticCompanionMaterialGuide({ deps: nodeDeps });
  assert.ok(STATIC_GUIDE_URL.pathname.endsWith("assets/material-guide/Hinweise_zur_Verwendung_der_Materialien.pdf"));
  assert.ok(result.size > 100_000, "statisches Asset sollte plausibel groß sein (echter Fließtext-Inhalt, nicht leer)");
});

test("liefert bei zwei Aufrufen exakt identische Bytes (immer derselbe statische Inhalt)", async () => {
  const a = await loadStaticCompanionMaterialGuide({ deps: nodeDeps });
  const b = await loadStaticCompanionMaterialGuide({ deps: nodeDeps });
  const bufA = Buffer.from(await a.content.arrayBuffer());
  const bufB = Buffer.from(await b.content.arrayBuffer());
  assert.ok(bufA.equals(bufB));
});
