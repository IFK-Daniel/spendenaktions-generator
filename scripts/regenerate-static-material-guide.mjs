import { writeFileSync } from "node:fs";
import { generateCompanionMaterialGuide } from "../core/materials/generateCompanionMaterialGuide.js";
import { loadFontFile } from "../core/pdf/loadFontFile.js";
import { STATIC_GUIDE_URL } from "../core/materials/staticCompanionMaterialGuide.js";
import { fileURLToPath } from "node:url";

/**
 * Regeneriert das statische Begleit-Anleitung-Asset
 * (`assets/material-guide/Hinweise_zur_Verwendung_der_Materialien.pdf`)
 * aus den modularen Textquellen (`core/materials/companionMaterialGuideContent.js`)
 * über den bestehenden Renderer (`generateCompanionMaterialGuide.js`).
 *
 * Produktiv wird NICHT mehr dieser Renderer zur Laufzeit aufgerufen,
 * sondern das hier erzeugte statische PDF direkt ausgeliefert (siehe
 * `core/materials/staticCompanionMaterialGuide.js` für die Begründung).
 * Bei jeder inhaltlichen Änderung an `companionMaterialGuideContent.js`
 * dieses Skript erneut ausführen — und das Ergebnis danach VISUELL
 * prüfen (z. B. über `artifacts/pdf-regression/`, siehe
 * `scripts/generate-pdf-regression-artifacts.mjs`), bevor es committet
 * wird.
 *
 * Aufruf: node scripts/regenerate-static-material-guide.mjs
 */
const guide = await generateCompanionMaterialGuide({ deps: { loadFontBytes: loadFontFile } });
const bytes = Buffer.from(await guide.content.arrayBuffer());
const outPath = fileURLToPath(STATIC_GUIDE_URL);
writeFileSync(outPath, bytes);
console.log(`Statische Anleitung neu erzeugt: ${outPath} (${bytes.length} Byte)`);
console.log("Bitte vor dem Commit visuell prüfen (siehe artifacts/pdf-regression/).");
