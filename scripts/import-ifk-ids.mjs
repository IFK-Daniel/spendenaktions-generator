#!/usr/bin/env node
/**
 * Internes Import-Script für bereits vergebene ("Alt"-)IFK-IDs.
 *
 * Zweck: Einmaliger Import bekannter Alt-IDs (z. B. aus humbee ermittelt)
 * in den neuen Reservierungs-Speicher (Upstash Redis), BEVOR "Neu
 * generieren" produktiv genutzt wird — damit keine dieser IDs versehentlich
 * erneut vergeben werden kann. Speichert ausschließlich die IFK-ID selbst
 * (kein Name, keine E-Mail, keine Rolle) — siehe `api/reserve-ifk-id.js`.
 *
 * Idempotent: mehrfaches Ausführen mit derselben Eingabe erzeugt keine
 * Fehler und keine zusätzlichen Einträge (Redis `SET ... NX`, siehe
 * `api/_lib/upstashRedis.js`).
 *
 * Nutzung:
 *   node scripts/import-ifk-ids.mjs <Datei mit einer IFK-ID pro Zeile>
 *   node scripts/import-ifk-ids.mjs < ids.txt        (Eingabe über stdin)
 *
 * Benötigt dieselben Umgebungsvariablen wie `api/reserve-ifk-id.js`:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * (z. B. per `vercel env pull` oder manuell in der Shell exportiert).
 */
import { readFileSync } from "node:fs";
import { importLegacyIfkIds } from "../core/id/importLegacyIfkIds.js";
import { isUpstashConfigured, redisSetNx } from "../api/_lib/upstashRedis.js";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function readInput() {
  const filePath = process.argv[2];
  if (filePath) {
    return readFileSync(filePath, "utf8");
  }
  if (process.stdin.isTTY) {
    console.error("Fehler: keine Eingabedatei angegeben und keine Daten über stdin.");
    console.error("Nutzung: node scripts/import-ifk-ids.mjs <Datei> ODER node scripts/import-ifk-ids.mjs < ids.txt");
    process.exit(1);
  }
  return readStdin();
}

async function main() {
  if (!isUpstashConfigured()) {
    console.error("Fehler: UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN sind nicht gesetzt.");
    process.exit(1);
  }

  const raw = await readInput();
  const rawLines = raw.split(/\r?\n/);

  const reserve = (id) => redisSetNx(`ifk:id:${id}`, "1");
  const report = await importLegacyIfkIds(rawLines, reserve);

  if (report.invalidEntries.length > 0) {
    console.log("Ungültige Einträge:");
    for (const entry of report.invalidEntries) {
      console.log(`  "${entry.raw}" (${entry.reason})`);
    }
    console.log("");
  }

  console.log(`Eingelesen (nicht-leere Zeilen): ${report.totalLines}`);
  console.log(`Gültig:                          ${report.validCount}`);
  console.log(`Ungültig:                        ${report.invalidCount}`);
  console.log(`Eindeutig (nach Dubletten):       ${report.uniqueCount}`);
  console.log(`Dubletten in der Eingabe:         ${report.duplicateCount}`);
  console.log(`Neu importiert:                   ${report.importedCount}`);
  console.log(`Bereits vorhanden:                ${report.alreadyPresentCount}`);

  if (report.invalidCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Import fehlgeschlagen:", err instanceof Error ? err.message : err);
  process.exit(1);
});
