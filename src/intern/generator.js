import logoUrl from "../../Medien/IFK Logo nur Zähne.png";
import { generateIfkId } from "../../core/id/generateIfkId.js";
import { validateIfkId } from "../../core/id/validateIfkId.js";
import { buildMaterialManifest } from "../../core/materials/buildMaterialManifest.js";
import { generateQrMaterials } from "../../core/materials/generateQrMaterials.js";
import { MATERIAL_TYPE_KEYS } from "../../core/materials/materialTypes.js";
import { extractPaypalLink } from "../../core/text/extractPaypalLink.js";

const PAYPAL_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]);
const GIRO_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_GIRO_GREEN, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]);

/**
 * Verdrahtet die Oberfläche des Materialgenerators (Personendaten,
 * Materialauswahl, Erzeugung, Ergebnisdarstellung). Enthält keine
 * Login-/Logout-Logik — siehe `src/intern/auth.js`.
 */
export function initGenerator() {
  const firstNameInput = document.getElementById("first-name-input");
  const lastNameInput = document.getElementById("last-name-input");
  const ifkIdInput = document.getElementById("ifk-id-input");
  const ifkIdGenerateBtn = document.getElementById("ifk-id-generate-btn");
  const paypalInput = document.getElementById("paypal-input");
  const generateBtn = document.getElementById("generate-btn");
  const errorMessage = document.getElementById("error-message");
  const results = document.getElementById("results");
  const resultPersonName = document.getElementById("result-person-name");
  const resultGrid = document.getElementById("result-grid");
  const materialCheckboxes = Array.from(document.querySelectorAll("[data-material-key]"));

  ifkIdInput.value = generateIfkId();

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    results.hidden = true;
  }

  function clearError() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
  }

  function selectedMaterialKeys() {
    return materialCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.dataset.materialKey);
  }

  function renderResults(person, files) {
    resultPersonName.textContent = `${person.firstName} ${person.lastName} (${person.ifkId})`;
    resultGrid.innerHTML = "";

    for (const file of files) {
      const objectUrl = URL.createObjectURL(file.content);

      const block = document.createElement("div");
      block.className = "result-block";

      const heading = document.createElement("h4");
      heading.textContent = file.label;
      block.appendChild(heading);

      const img = document.createElement("img");
      img.src = objectUrl;
      img.alt = file.label;
      block.appendChild(img);

      const downloadLink = document.createElement("a");
      downloadLink.className = "download-link";
      downloadLink.href = objectUrl;
      downloadLink.download = file.filename;
      downloadLink.textContent = "PNG herunterladen";
      block.appendChild(downloadLink);

      resultGrid.appendChild(block);
    }

    results.hidden = false;
  }

  async function handleGenerate() {
    clearError();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    if (!firstName || !lastName) {
      showError("Bitte Vor- und Nachname eintragen.");
      return;
    }

    const genderInput = document.querySelector('input[name="gender"]:checked');
    if (!genderInput) {
      showError("Bitte ein Geschlecht auswählen.");
      return;
    }

    const ifkIdCheck = validateIfkId(ifkIdInput.value.trim());
    if (!ifkIdCheck.valid) {
      showError("Bitte eine gültige IFK-ID eintragen (z. B. IFK7QX).");
      return;
    }
    ifkIdInput.value = ifkIdCheck.normalized;

    const materialKeys = selectedMaterialKeys();
    if (materialKeys.length === 0) {
      showError("Bitte mindestens ein Material auswählen.");
      return;
    }

    const needsPaypal = materialKeys.some((key) => PAYPAL_KEYS.has(key));
    const needsGiro = materialKeys.some((key) => GIRO_KEYS.has(key));

    let paypalUrl;
    if (needsPaypal) {
      paypalUrl = extractPaypalLink(paypalInput.value.trim());
      if (!paypalUrl) {
        showError("Kein gültiger PayPal-Link gefunden. Bitte einen Link wie z. B. https://www.paypal.com/donate/... einfügen.");
        return;
      }
    }

    const manifest = buildMaterialManifest({
      firstName,
      lastName,
      ifkId: ifkIdCheck.normalized,
      gender: genderInput.value,
      materials: materialKeys,
    });

    try {
      const files = await generateQrMaterials({
        manifest,
        paypalUrl,
        girocode: needsGiro ? {} : undefined,
        logo: logoUrl,
      });

      renderResults(manifest.person, files);
    } catch (err) {
      showError(err.message || "Beim Erstellen der Materialien ist ein Fehler aufgetreten.");
    }
  }

  ifkIdGenerateBtn.addEventListener("click", () => {
    ifkIdInput.value = generateIfkId();
  });

  generateBtn.addEventListener("click", handleGenerate);
}
