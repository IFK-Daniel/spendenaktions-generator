import logoUrl from "../../Medien/IFK Logo nur Zähne.png";
import { generateIfkId } from "../../core/id/generateIfkId.js";
import { validateIfkId } from "../../core/id/validateIfkId.js";
import { isValidEmail } from "../../core/mail/validateEmail.js";
import { sendRepresentativeMaterials } from "../../core/mail/sendRepresentativeMaterials.js";
import { buildMaterialManifest } from "../../core/materials/buildMaterialManifest.js";
import { buildMaterialZip } from "../../core/materials/buildMaterialZip.js";
import { buildRepresentativeDeliveryRequest } from "../../core/materials/buildRepresentativeDeliveryRequest.js";
import { generateQrMaterials } from "../../core/materials/generateQrMaterials.js";
import { MATERIAL_TYPE_KEYS } from "../../core/materials/materialTypes.js";
import { fetchRepresentativePhoto } from "../../core/photo/fetchRepresentativePhoto.js";
import { getPhotoRetrievalErrorMessage } from "../../core/photo/getPhotoRetrievalErrorMessage.js";
import { extractPaypalLink } from "../../core/text/extractPaypalLink.js";
import { isHttpUrl } from "../../core/text/isHttpUrl.js";

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
  const emailInput = document.getElementById("email-input");
  const phoneInput = document.getElementById("phone-input");
  const photoUrlInput = document.getElementById("photo-url-input");
  const federalStateInput = document.getElementById("federal-state-input");
  const regionInput = document.getElementById("region-input");
  const paypalInput = document.getElementById("paypal-input");
  const generateBtn = document.getElementById("generate-btn");
  const errorMessage = document.getElementById("error-message");
  const results = document.getElementById("results");
  const resultPersonName = document.getElementById("result-person-name");
  const resultGrid = document.getElementById("result-grid");
  const photoStatus = document.getElementById("photo-status");
  const materialCheckboxes = Array.from(document.querySelectorAll("[data-material-key]"));

  const deliverySection = document.getElementById("delivery-section");
  const deliveryTargetRadios = Array.from(document.querySelectorAll('input[name="delivery-target"]'));
  const alternativeEmailField = document.getElementById("alternative-email-field");
  const alternativeEmailInput = document.getElementById("alternative-email-input");
  const deliveryErrorMessage = document.getElementById("delivery-error-message");
  const deliveryStatus = document.getElementById("delivery-status");
  const deliverySendBtn = document.getElementById("delivery-send-btn");

  let lastManifest = null;
  let lastFiles = null;
  let lastPhoto = null;
  let isSending = false;

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

  function showPhotoStatus(message, type) {
    photoStatus.textContent = message;
    photoStatus.className = `photo-status ${type}`;
    photoStatus.hidden = false;
  }

  function clearPhotoStatus() {
    photoStatus.hidden = true;
    photoStatus.textContent = "";
    photoStatus.className = "photo-status";
  }

  async function checkRepresentativePhoto(photoUrl) {
    showPhotoStatus("Foto wird geprüft …", "loading");

    try {
      const result = await fetchRepresentativePhoto(photoUrl);

      if (result.ok) {
        lastPhoto = result;
        const sizeKb = Math.max(1, Math.round(result.size / 1024));
        showPhotoStatus(`Foto erfolgreich geladen (${result.format}, ${sizeKb} KB).`, "success");
      } else {
        lastPhoto = null;
        showPhotoStatus(getPhotoRetrievalErrorMessage(result.reason), "error");
      }
    } catch {
      lastPhoto = null;
      showPhotoStatus(getPhotoRetrievalErrorMessage(), "error");
    }
  }

  function showDeliveryError(message) {
    deliveryErrorMessage.textContent = message;
    deliveryErrorMessage.hidden = false;
  }

  function clearDeliveryError() {
    deliveryErrorMessage.hidden = true;
    deliveryErrorMessage.textContent = "";
  }

  function showDeliveryStatus(message, type) {
    deliveryStatus.textContent = message;
    deliveryStatus.className = `delivery-status ${type}`;
    deliveryStatus.hidden = false;
  }

  function clearDeliveryStatus() {
    deliveryStatus.hidden = true;
    deliveryStatus.textContent = "";
    deliveryStatus.className = "delivery-status";
  }

  function selectedDeliveryTarget() {
    const checked = deliveryTargetRadios.find((radio) => radio.checked);
    return checked ? checked.value : "representative";
  }

  function resetDeliverySection() {
    clearDeliveryError();
    clearDeliveryStatus();
    alternativeEmailInput.value = "";
    alternativeEmailField.hidden = true;
    for (const radio of deliveryTargetRadios) {
      radio.checked = radio.value === "representative";
    }
    deliverySendBtn.disabled = false;
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

  async function handleSendDelivery() {
    if (isSending) return;

    clearDeliveryError();

    if (!lastManifest || !lastFiles || lastFiles.length === 0) {
      showDeliveryError("Bitte zuerst Materialien erstellen.");
      return;
    }

    const target = selectedDeliveryTarget();
    let alternativeEmail;
    if (target === "alternative") {
      alternativeEmail = alternativeEmailInput.value.trim();
      if (!isValidEmail(alternativeEmail)) {
        showDeliveryError("Bitte eine gültige abweichende E-Mail-Adresse eintragen.");
        return;
      }
    }

    isSending = true;
    deliverySendBtn.disabled = true;
    clearDeliveryStatus();
    showDeliveryStatus("Versand läuft …", "loading");

    try {
      const zip = await buildMaterialZip({
        ifkId: lastManifest.person.ifkId,
        firstName: lastManifest.person.firstName,
        lastName: lastManifest.person.lastName,
        files: lastFiles,
      });

      const request = await buildRepresentativeDeliveryRequest({
        manifest: lastManifest,
        zip,
        files: lastFiles,
        alternativeEmail,
        logoUrl: `${window.location.origin}/ifk-logo-full.png`,
      });

      const result = await sendRepresentativeMaterials(request);

      if (result.ok) {
        showDeliveryStatus("Versand erfolgreich.", "success");
      } else if (!result.representative.success && !result.humbee.success) {
        showDeliveryStatus(
          `Versand an Empfänger fehlgeschlagen. Dokumentation an humbee fehlgeschlagen.`,
          "error"
        );
      } else if (!result.representative.success) {
        showDeliveryStatus(
          result.representative.error || "Versand an Empfänger fehlgeschlagen.",
          "error"
        );
      } else {
        showDeliveryStatus(
          result.humbee.error || "Dokumentation an humbee fehlgeschlagen. Der Empfänger hat seine Materialien bereits erhalten.",
          "error"
        );
      }
    } catch (err) {
      showDeliveryStatus(err.message || "Versand fehlgeschlagen. Bitte versuche es später erneut.", "error");
    } finally {
      isSending = false;
      deliverySendBtn.disabled = false;
    }
  }

  async function handleGenerate() {
    clearError();
    clearPhotoStatus();
    deliverySection.hidden = true;
    lastManifest = null;
    lastFiles = null;
    lastPhoto = null;

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

    const email = emailInput.value.trim();
    if (!isValidEmail(email)) {
      showError("Bitte eine gültige E-Mail-Adresse eintragen.");
      return;
    }

    const phone = phoneInput.value.trim();
    if (!phone) {
      showError("Bitte eine Telefonnummer eintragen.");
      return;
    }

    const photoUrl = photoUrlInput.value.trim();
    if (!isHttpUrl(photoUrl)) {
      showError("Bitte einen gültigen Foto-Link (http/https) eintragen.");
      return;
    }

    const federalState = federalStateInput.value.trim();
    if (!federalState) {
      showError("Bitte ein Bundesland eintragen.");
      return;
    }

    const region = regionInput.value.trim();
    if (!region) {
      showError("Bitte eine Region eintragen.");
      return;
    }

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
      email,
      phone,
      photoUrl,
      federalState,
      region,
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

      lastManifest = manifest;
      lastFiles = files;
      resetDeliverySection();
      deliverySection.hidden = false;

      await checkRepresentativePhoto(photoUrl);
    } catch (err) {
      showError(err.message || "Beim Erstellen der Materialien ist ein Fehler aufgetreten.");
    }
  }

  ifkIdGenerateBtn.addEventListener("click", () => {
    ifkIdInput.value = generateIfkId();
  });

  for (const radio of deliveryTargetRadios) {
    radio.addEventListener("change", () => {
      alternativeEmailField.hidden = selectedDeliveryTarget() !== "alternative";
    });
  }

  generateBtn.addEventListener("click", handleGenerate);
  deliverySendBtn.addEventListener("click", handleSendDelivery);
}
