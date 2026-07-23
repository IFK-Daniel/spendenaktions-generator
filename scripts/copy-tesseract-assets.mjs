import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Kopiert die für die clientseitige Screenshot-OCR benötigten
 * Tesseract.js-Dateien (Worker-Skript, WASM-Kernmodule, deutsche
 * Trainingsdaten) aus `node_modules` nach `public/tesseract/`, damit
 * sie über die eigene Anwendung ausgeliefert werden und zur Laufzeit
 * keine Anfrage an ein fremdes CDN nötig ist.
 *
 * Läuft als `postinstall` sowie vor `dev`/`build`, damit die Dateien
 * unabhängig davon aktuell sind, wann zuletzt `npm install` lief.
 */

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const targetDir = join(rootDir, "public", "tesseract");
const langDataDir = join(targetDir, "lang-data");

mkdirSync(targetDir, { recursive: true });
mkdirSync(langDataDir, { recursive: true });

const FILES = [
  {
    from: join(rootDir, "node_modules", "tesseract.js", "dist", "worker.min.js"),
    to: join(targetDir, "worker.min.js"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm.js"),
    to: join(targetDir, "tesseract-core-lstm.wasm.js"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm"),
    to: join(targetDir, "tesseract-core-lstm.wasm"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-simd-lstm.wasm.js"),
    to: join(targetDir, "tesseract-core-simd-lstm.wasm.js"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-simd-lstm.wasm"),
    to: join(targetDir, "tesseract-core-simd-lstm.wasm"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-relaxedsimd-lstm.wasm.js"),
    to: join(targetDir, "tesseract-core-relaxedsimd-lstm.wasm.js"),
  },
  {
    from: join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-relaxedsimd-lstm.wasm"),
    to: join(targetDir, "tesseract-core-relaxedsimd-lstm.wasm"),
  },
  {
    from: join(rootDir, "node_modules", "@tesseract.js-data", "deu", "4.0.0_best_int", "deu.traineddata.gz"),
    to: join(langDataDir, "deu.traineddata.gz"),
  },
];

let copied = 0;
for (const { from, to } of FILES) {
  if (!existsSync(from)) {
    console.warn(`[copy-tesseract-assets] Quelle fehlt, übersprungen: ${from}`);
    continue;
  }
  copyFileSync(from, to);
  copied += 1;
}

console.log(`[copy-tesseract-assets] ${copied}/${FILES.length} Dateien nach public/tesseract kopiert.`);
