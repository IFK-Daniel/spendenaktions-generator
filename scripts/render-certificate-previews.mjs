/**
 * Erzeugt echte Test-Urkunden für jede Urkundenvorlage (Repräsentant
 * männlich/weiblich + die sechs neuen Wegbegleiter-Urkunden) mit mehreren
 * Testnamen und legt sie als PDF unter `artifacts/certificate-preview/`
 * ab. Die Rasterung nach PNG und die Vergleichsgrafik übernimmt
 * anschließend `scripts/build-certificate-preview-sheet.py`.
 *
 * Aufruf: `node scripts/render-certificate-previews.mjs`
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { renderFlyer } from "../core/pdf/renderFlyer.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";

import { certificateRepresentativeMaleTemplate } from "../templates/certificate-representative-male/template.config.js";
import { certificateRepresentativeFemaleTemplate } from "../templates/certificate-representative-female/template.config.js";
import { certificateAmbassadorMaleTemplate } from "../templates/certificate-ambassador-male/template.config.js";
import { certificateAmbassadorFemaleTemplate } from "../templates/certificate-ambassador-female/template.config.js";
import { certificateAdvisoryBoardTemplate } from "../templates/certificate-advisory-board/template.config.js";
import { certificateCuratoriumTemplate } from "../templates/certificate-curatorium/template.config.js";
import { certificateExpertCouncilTemplate } from "../templates/certificate-expert-council/template.config.js";
import { certificateEconomicCouncilTemplate } from "../templates/certificate-economic-council/template.config.js";

const OUT_DIR = fileURLToPath(new URL("../artifacts/certificate-preview/", import.meta.url));

const TEMPLATES = [
  { slug: "representative-male", label: "Repräsentantenurkunde (m)", template: certificateRepresentativeMaleTemplate },
  { slug: "representative-female", label: "Repräsentantenurkunde (w)", template: certificateRepresentativeFemaleTemplate },
  { slug: "ambassador-male", label: "Botschafterurkunde (m)", template: certificateAmbassadorMaleTemplate },
  { slug: "ambassador-female", label: "Botschafterinnenurkunde (w)", template: certificateAmbassadorFemaleTemplate },
  { slug: "advisory-board", label: "Urkunde Beirat", template: certificateAdvisoryBoardTemplate },
  { slug: "curatorium", label: "Urkunde Kuratorium", template: certificateCuratoriumTemplate },
  { slug: "expert-council", label: "Urkunde Fachrat", template: certificateExpertCouncilTemplate },
  { slug: "economic-council", label: "Urkunde Wirtschaftsrat", template: certificateEconomicCouncilTemplate },
];

const NAMES = [
  { slug: "kim-yu", value: "Kim Yu" },
  { slug: "daniel-feigenbutz", value: "Daniel Feigenbutz" },
  { slug: "alexandra-mazur", value: "Alexandra Mazur" },
  { slug: "maximilian-bartholomaeus-schweighofer", value: "Maximilian Bartholomäus-Schweighofer" },
];

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const index = [];
  for (const { slug, label, template } of TEMPLATES) {
    for (const name of NAMES) {
      const { bytes, warnings } = await renderFlyer({
        templateConfig: template,
        textValues: { name: name.value },
        imageAssets: {},
        deps: { loadTemplateAssets },
      });
      const filename = `${slug}__${name.slug}.pdf`;
      await writeFile(new URL(filename, `file://${OUT_DIR}`), bytes);
      index.push({ slug, label, template: template.key, name: name.value, filename, warnings });
      const warn = warnings.length ? `  ⚠ ${warnings.map((w) => w.reason).join(" ")}` : "";
      console.log(`${filename}${warn}`);
    }
  }

  await writeFile(new URL("index.json", `file://${OUT_DIR}`), JSON.stringify(index, null, 2));
  console.log(`\n${index.length} PDFs → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
