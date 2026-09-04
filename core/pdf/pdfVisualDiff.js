import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(new URL("../../scripts/pdf-visual-diff.py", import.meta.url));

/**
 * Rendert eine PDF-Seite ECHT als Pixelbild (`scripts/pdf-visual-diff.py`,
 * PyMuPDF) und vergleicht sie gegen ein eingecheckstes Referenzbild
 * ("golden"). Deckt Fehlerklassen ab, die reine Text-/CMap-Extraktion
 * (`extractPdfText.js`, `pdfjs-dist`) NICHT erkennt — siehe die
 * Erklärung im Python-Skript: der `embedFont(..., { subset: true })`-
 * Bug hat die ToUnicode-CMap unverändert gelassen, sodass Text-
 * Extraktion weiterhin den korrekten Namen meldete, obwohl die
 * tatsächlich sichtbaren Glyphen zerstört waren.
 *
 * Voraussetzung: `python3` mit `PyMuPDF`/`Pillow`/`numpy` installiert
 * (kein npm-Paket — Node-Tests, die diese Funktion nutzen, sollten bei
 * `available() === false` übersprungen werden statt fehlzuschlagen,
 * damit Umgebungen ohne diese Python-Pakete nicht spurious rot
 * werden).
 *
 * @param {object} params
 * @param {string} params.pdfPath Pfad zur zu prüfenden PDF-Datei.
 * @param {number} params.pageIndex
 * @param {string} params.goldenPngPath Pfad zum Referenzbild.
 * @param {number} [params.zoom]
 * @param {number} [params.maxMeanDiff]
 * @param {number} [params.maxMaxDiff]
 * @returns {{ ok: boolean, meanDiff?: number, maxDiff?: number, error?: string }}
 */
export function comparePdfPageToGolden({ pdfPath, pageIndex, goldenPngPath, zoom, maxMeanDiff, maxMaxDiff }) {
  const args = [SCRIPT_PATH, pdfPath, String(pageIndex), goldenPngPath];
  if (zoom !== undefined) args.push("--zoom", String(zoom));
  if (maxMeanDiff !== undefined) args.push("--max-mean-diff", String(maxMeanDiff));
  if (maxMaxDiff !== undefined) args.push("--max-max-diff", String(maxMaxDiff));

  const result = spawnSync("python3", args, { encoding: "utf8" });
  if (result.error) {
    return { ok: false, error: `python3 nicht ausführbar: ${result.error.message}` };
  }
  const lastLine = (result.stdout || "").trim().split("\n").pop();
  try {
    return JSON.parse(lastLine);
  } catch {
    return { ok: false, error: `unerwartete Ausgabe: stdout=${result.stdout} stderr=${result.stderr}` };
  }
}

/**
 * Erzeugt (bzw. überschreibt) ein Referenzbild aus dem aktuellen
 * Rendering. Nur bewusst/manuell aufrufen (z. B. beim erstmaligen
 * Anlegen eines Tests oder nach einer GEPRÜFTEN, gewollten visuellen
 * Änderung) — niemals automatisch im Testlauf, sonst verliert der Test
 * seine Schutzwirkung.
 */
export function createGolden({ pdfPath, pageIndex, goldenPngPath, zoom }) {
  const args = [SCRIPT_PATH, pdfPath, String(pageIndex), goldenPngPath, "--create"];
  if (zoom !== undefined) args.push("--zoom", String(zoom));
  const result = spawnSync("python3", args, { encoding: "utf8" });
  const lastLine = (result.stdout || "").trim().split("\n").pop();
  try {
    return JSON.parse(lastLine);
  } catch {
    return { ok: false, error: `unerwartete Ausgabe: stdout=${result.stdout} stderr=${result.stderr}` };
  }
}

/**
 * Prüft, ob `python3` mit den benötigten Paketen (PyMuPDF/Pillow/numpy)
 * verfügbar ist — Tests sollten sich damit selbst überspringen
 * (`t.skip(...)`), statt in Umgebungen ohne Python fehlzuschlagen.
 * @returns {boolean}
 */
export function isVisualDiffAvailable() {
  const result = spawnSync("python3", ["-c", "import fitz, PIL, numpy"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}
