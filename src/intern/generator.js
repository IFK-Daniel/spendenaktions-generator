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
import {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  extractRepresentativeDataFromScreenshot,
} from "../../core/screenshot/extractRepresentativeDataFromScreenshot.js";
import { runScreenshotOcr } from "../../core/screenshot/runScreenshotOcr.js";
import { genderDisplayLabel } from "../../core/screenshot/genderDisplayLabel.js";
import { computeCropRectangle } from "../../core/screenshot/computeCropRectangle.js";

const PAYPAL_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN, MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]);
const GIRO_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_GIRO_GREEN, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]);

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

const SCREENSHOT_FIELD_LABELS = {
  firstName: "Vorname",
  lastName: "Nachname",
  gender: "Geschlecht",
  phone: "Telefonnummer",
  federalState: "Bundesland",
  region: "Region",
  ifkEmail: "IFK-Mailadresse",
  regularEmail: "Mail-Adresse",
  emailForForm: "E-Mail (für Formular)",
  ifkId: "IFK-ID",
  paypalUrl: "PayPal-URL",
};

const SCREENSHOT_STATUS_LABELS = {
  recognized: "erkannt",
  not_recognized: "nicht erkannt",
  needs_review: "prüfbedürftig",
  confirmed_empty: "Neu generieren",
};

const SCREENSHOT_EXTRACTION_ERROR_MESSAGES = {
  invalid_image: "Kein gültiges Bild übermittelt.",
  invalid_mime_type: "Nur PNG-, JPEG- oder WebP-Bilder werden unterstützt.",
  timeout: "Die Texterkennung hat zu lange gedauert. Bitte erneut versuchen.",
  ocr_error: "Die Texterkennung ist fehlgeschlagen. Bitte erneut versuchen.",
};

function getScreenshotExtractionErrorMessage(reason) {
  return SCREENSHOT_EXTRACTION_ERROR_MESSAGES[reason] || "Der Screenshot konnte nicht ausgewertet werden.";
}

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
  const photoPreview = document.getElementById("photo-preview");
  const photoPreviewImg = document.getElementById("photo-preview-img");
  const materialCheckboxes = Array.from(document.querySelectorAll("[data-material-key]"));

  const screenshotDropzone = document.getElementById("screenshot-dropzone");
  const screenshotSelectBtn = document.getElementById("screenshot-select-btn");
  const screenshotFileInput = document.getElementById("screenshot-file-input");
  const screenshotImportStatus = document.getElementById("screenshot-import-status");
  const screenshotImportPreview = document.getElementById("screenshot-import-preview");
  const screenshotPreviewBody = document.getElementById("screenshot-preview-body");
  const screenshotApplyBtn = document.getElementById("screenshot-apply-btn");
  const screenshotOriginalImgBtn = document.getElementById("screenshot-original-img-btn");
  const screenshotOriginalImg = document.getElementById("screenshot-original-img");
  const screenshotLightbox = document.getElementById("screenshot-lightbox");
  const screenshotLightboxImg = document.getElementById("screenshot-lightbox-img");
  const screenshotLightboxClose = document.getElementById("screenshot-lightbox-close");

  const genderRadios = Array.from(document.querySelectorAll('input[name="gender"]'));
  const fieldBadges = new Map(
    Array.from(document.querySelectorAll("[data-field-badge]")).map((el) => [el.dataset.fieldBadge, el])
  );
  const fieldBadgeSourceElements = {
    firstName: [firstNameInput],
    lastName: [lastNameInput],
    gender: genderRadios,
    ifkId: [ifkIdInput],
    email: [emailInput],
    phone: [phoneInput],
    federalState: [federalStateInput],
    region: [regionInput],
    paypalUrl: [paypalInput],
  };

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
  let lastExtractionFields = null;
  let isExtractingScreenshot = false;
  let manuallyReviewedFieldKeys = new Set();
  let lastScreenshotObjectUrl = null;

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
    clearPhotoPreview();
  }

  function showPhotoPreview(dataUrl) {
    photoPreviewImg.src = dataUrl;
    photoPreviewImg.alt = "Vorschau des für den Repräsentanten geladenen Fotos";
    photoPreview.hidden = false;
  }

  function clearPhotoPreview() {
    photoPreview.hidden = true;
    photoPreviewImg.src = "";
    photoPreviewImg.alt = "";
  }

  async function checkRepresentativePhoto(photoUrl) {
    clearPhotoPreview();
    showPhotoStatus("Foto wird geprüft …", "loading");

    try {
      const result = await fetchRepresentativePhoto(photoUrl);

      if (result.ok) {
        lastPhoto = result;
        const sizeKb = Math.max(1, Math.round(result.size / 1024));
        showPhotoStatus(`Foto erfolgreich geladen (${result.format}, ${sizeKb} KB).`, "success");
        showPhotoPreview(`data:${result.contentType};base64,${result.content}`);
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

  function showScreenshotStatus(message, type) {
    screenshotImportStatus.textContent = message;
    screenshotImportStatus.className = `screenshot-import-status ${type}`;
    screenshotImportStatus.hidden = false;
  }

  function clearScreenshotStatus() {
    screenshotImportStatus.hidden = true;
    screenshotImportStatus.textContent = "";
    screenshotImportStatus.className = "screenshot-import-status";
  }

  function openLightbox(src) {
    screenshotLightboxImg.src = src;
    screenshotLightbox.hidden = false;
  }

  function closeLightbox() {
    screenshotLightbox.hidden = true;
    screenshotLightboxImg.src = "";
  }

  function clearOriginalScreenshot() {
    if (lastScreenshotObjectUrl) {
      URL.revokeObjectURL(lastScreenshotObjectUrl);
      lastScreenshotObjectUrl = null;
    }
    screenshotOriginalImg.src = "";
  }

  // Zeigt den hochgeladenen Screenshot dauerhaft neben der
  // Importvorschau an (Original bleibt ausschließlich im Browser —
  // keine Speicherung, keine Übertragung). Löst erst auf, sobald das
  // Bild geladen ist, damit `naturalWidth`/`naturalHeight` für die
  // Bildausschnitte (siehe `cropFieldRegion`) zuverlässig verfügbar
  // sind. Ein zuvor erzeugtes Object-URL wird vor dem Erstellen eines
  // neuen sauber freigegeben.
  function showOriginalScreenshot(file) {
    return new Promise((resolve) => {
      clearOriginalScreenshot();
      const objectUrl = URL.createObjectURL(file);
      lastScreenshotObjectUrl = objectUrl;

      screenshotOriginalImg.onload = () => resolve();
      screenshotOriginalImg.onerror = () => resolve();
      screenshotOriginalImg.src = objectUrl;
    });
  }

  // Erzeugt für ein prüfbedürftiges Feld mit bekannter Bounding-Box
  // einen vergrößerten Bildausschnitt der zugehörigen Originalzeile
  // (mit etwas Rand) aus dem bereits geladenen Original-Screenshot —
  // rein clientseitig über Canvas, keine erneute Bildübertragung.
  // Liefert `null`, wenn keine verlässliche Bounding-Box vorliegt
  // (siehe `core/screenshot/computeCropRectangle.js`); dann wird
  // bewusst kein künstlicher Ausschnitt erzeugt.
  function cropFieldRegion(bbox) {
    if (!screenshotOriginalImg.naturalWidth || !screenshotOriginalImg.naturalHeight) return null;

    const rect = computeCropRectangle(bbox, screenshotOriginalImg.naturalWidth, screenshotOriginalImg.naturalHeight);
    if (!rect) return null;

    const scale = Math.min(4, Math.max(1, 220 / rect.width));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      screenshotOriginalImg,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/png");
  }

  function clearScreenshotPreview() {
    screenshotImportPreview.hidden = true;
    screenshotPreviewBody.innerHTML = "";
    clearOriginalScreenshot();
  }

  function fieldCharsForKey(fields, key) {
    const field = fields[key];
    if (!field) return undefined;
    if (Array.isArray(field.chars)) return field.chars;
    // Die E-Mail-für-Formular-Zeile übernimmt unverändert den Wert des
    // ausgewählten Quellfelds (IFK-Mailadresse oder normale
    // Mail-Adresse) — Zeichen-Markierungen werden entsprechend
    // gespiegelt, damit auch dort nur die tatsächlich unsicheren
    // Zeichen hervorgehoben werden.
    if (key === "emailForForm" && field.source) {
      const sourceField = fields[field.source];
      if (sourceField && Array.isArray(sourceField.chars) && sourceField.value === field.value) {
        return sourceField.chars;
      }
    }
    return undefined;
  }

  function renderStatusBadge(statusCell, key, statusValue) {
    statusCell.innerHTML = "";
    const statusBadge = document.createElement("span");
    const displayStatus = manuallyReviewedFieldKeys.has(key) ? "manual" : statusValue;
    statusBadge.className = `screenshot-preview-status ${displayStatus}`;
    statusBadge.textContent =
      displayStatus === "manual" ? "manuell geprüft" : SCREENSHOT_STATUS_LABELS[statusValue] || statusValue;
    statusCell.appendChild(statusBadge);
  }

  function displayValueForKey(key, value) {
    return key === "gender" ? genderDisplayLabel(value) : value;
  }

  function appendFieldCropIfAvailable(valueCell, field) {
    if (field.status !== "needs_review" || !field.bbox) return;

    const dataUrl = cropFieldRegion(field.bbox);
    if (!dataUrl) return;

    const crop = document.createElement("img");
    crop.className = "screenshot-field-crop";
    crop.src = dataUrl;
    crop.alt = "Vergrößerter Ausschnitt der Originalzeile";
    valueCell.appendChild(crop);
  }

  function renderValueCell(valueCell, statusCell, fields, key) {
    const field = fields[key];
    const chars = manuallyReviewedFieldKeys.has(key) ? undefined : fieldCharsForKey(fields, key);
    valueCell.innerHTML = "";

    if (!field.value) {
      valueCell.appendChild(document.createTextNode("—"));
      return;
    }

    if (!chars) {
      valueCell.appendChild(document.createTextNode(displayValueForKey(key, field.value)));
      appendFieldCropIfAvailable(valueCell, field);
      return;
    }

    const charsContainer = document.createElement("span");
    charsContainer.className = "screenshot-value-editable";
    charsContainer.title = "Klicken, um das unsichere Zeichen zu korrigieren";
    for (const { char, uncertain } of chars) {
      const charSpan = document.createElement("span");
      charSpan.textContent = char;
      if (uncertain) charSpan.className = "screenshot-char-uncertain";
      charsContainer.appendChild(charSpan);
    }
    charsContainer.addEventListener("click", () => startEditingValueCell(valueCell, statusCell, fields, key));
    valueCell.appendChild(charsContainer);
    appendFieldCropIfAvailable(valueCell, field);
  }

  function startEditingValueCell(valueCell, statusCell, fields, key) {
    const field = fields[key];
    const input = document.createElement("input");
    input.type = "text";
    input.className = "screenshot-value-edit-input";
    input.value = field.value;

    const finishEditing = () => {
      field.value = input.value.trim();
      manuallyReviewedFieldKeys.add(key);
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, field.status);
    };

    input.addEventListener("blur", finishEditing);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });

    valueCell.innerHTML = "";
    valueCell.classList.remove("screenshot-value-editable");
    valueCell.appendChild(input);
    input.focus();
    input.select();
  }

  function renderScreenshotPreview(fields) {
    screenshotPreviewBody.innerHTML = "";
    manuallyReviewedFieldKeys = new Set();

    for (const key of Object.keys(SCREENSHOT_FIELD_LABELS)) {
      const field = fields[key];
      if (!field) continue;

      const row = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.textContent = SCREENSHOT_FIELD_LABELS[key];
      row.appendChild(labelCell);

      const valueCell = document.createElement("td");
      const statusCell = document.createElement("td");

      const statusValue = key === "emailForForm" ? (field.source ? "recognized" : "needs_review") : field.status;
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, statusValue);

      row.appendChild(valueCell);
      row.appendChild(statusCell);

      screenshotPreviewBody.appendChild(row);
    }

    screenshotImportPreview.hidden = false;
  }

  function markFieldAsImported(fieldKey) {
    const badge = fieldBadges.get(fieldKey);
    if (!badge) return;

    badge.hidden = false;

    const sourceElements = fieldBadgeSourceElements[fieldKey] || [];
    for (const el of sourceElements) {
      const eventName = el.type === "radio" ? "change" : "input";
      el.addEventListener(eventName, () => { badge.hidden = true; }, { once: true });
    }
  }

  async function handleScreenshotFile(file) {
    clearScreenshotStatus();
    clearScreenshotPreview();
    lastExtractionFields = null;

    if (!file) return;

    if (!ALLOWED_SCREENSHOT_MIME_TYPES.has(file.type)) {
      showScreenshotStatus("Nur PNG-, JPEG- oder WebP-Bilder werden unterstützt.", "error");
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      showScreenshotStatus("Die Datei ist zu groß (maximal 8 MB).", "error");
      return;
    }

    if (isExtractingScreenshot) return;
    isExtractingScreenshot = true;
    showScreenshotStatus("Screenshot wird ausgewertet …", "loading");

    try {
      const result = await extractRepresentativeDataFromScreenshot({
        file,
        mimeType: file.type,
        runOcr: runScreenshotOcr,
      });

      if (result.ok) {
        lastExtractionFields = result.fields;
        await showOriginalScreenshot(file);
        showScreenshotStatus("Screenshot erfolgreich ausgewertet. Bitte erkannte Daten prüfen.", "success");
        renderScreenshotPreview(result.fields);
      } else {
        showScreenshotStatus(getScreenshotExtractionErrorMessage(result.reason), "error");
      }
    } catch {
      showScreenshotStatus(getScreenshotExtractionErrorMessage(), "error");
    } finally {
      isExtractingScreenshot = false;
      screenshotFileInput.value = "";
    }
  }

  function formHasExistingData() {
    if (firstNameInput.value.trim()) return true;
    if (lastNameInput.value.trim()) return true;
    if (genderRadios.some((radio) => radio.checked)) return true;
    if (emailInput.value.trim()) return true;
    if (phoneInput.value.trim()) return true;
    if (federalStateInput.value.trim()) return true;
    if (regionInput.value.trim()) return true;
    if (paypalInput.value.trim()) return true;
    return false;
  }

  function handleApplyScreenshotFields() {
    if (!lastExtractionFields) return;

    if (formHasExistingData()) {
      const confirmed = window.confirm(
        "Das Formular enthält bereits Daten. Sollen diese durch die erkannten Werte aus dem Screenshot überschrieben werden?"
      );
      if (!confirmed) return;
    }

    const fields = lastExtractionFields;

    // Ein per Klick-Korrektur manuell geprüftes Feld gilt als ebenso
    // übernehmbar wie ein automatisch mit hoher Konfidenz erkanntes —
    // der Wert wurde bereits bewusst von einer Person bestätigt.
    const isApplyable = (key, field) => field.status === "recognized" || manuallyReviewedFieldKeys.has(key);

    if (isApplyable("firstName", fields.firstName)) {
      firstNameInput.value = fields.firstName.value;
      markFieldAsImported("firstName");
    }

    if (isApplyable("lastName", fields.lastName)) {
      lastNameInput.value = fields.lastName.value;
      markFieldAsImported("lastName");
    }

    if (isApplyable("gender", fields.gender)) {
      for (const radio of genderRadios) {
        radio.checked = radio.value === fields.gender.value;
      }
      markFieldAsImported("gender");
    }

    if (isApplyable("phone", fields.phone)) {
      phoneInput.value = fields.phone.value;
      markFieldAsImported("phone");
    }

    if (isApplyable("federalState", fields.federalState)) {
      federalStateInput.value = fields.federalState.value;
      markFieldAsImported("federalState");
    }

    if (isApplyable("region", fields.region)) {
      regionInput.value = fields.region.value;
      markFieldAsImported("region");
    }

    if (fields.emailForForm.value) {
      emailInput.value = fields.emailForForm.value;
      markFieldAsImported("email");
    }

    // Eine bereits manuell eingetragene IFK-ID wird vor dem Import nie
    // stillschweigend überschrieben; eine neue IFK-ID wird hier nie
    // automatisch erzeugt (dafür bleibt bewusst nur der bestehende
    // "Neu generieren"-Button zuständig).
    if (!ifkIdInput.value.trim() && isApplyable("ifkId", fields.ifkId)) {
      ifkIdInput.value = fields.ifkId.value;
      markFieldAsImported("ifkId");
    }

    if (isApplyable("paypalUrl", fields.paypalUrl)) {
      paypalInput.value = fields.paypalUrl.value;
      markFieldAsImported("paypalUrl");
    }

    showScreenshotStatus("Erkannte Daten wurden ins Formular übernommen.", "success");
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

  screenshotSelectBtn.addEventListener("click", () => screenshotFileInput.click());

  screenshotFileInput.addEventListener("change", () => {
    handleScreenshotFile(screenshotFileInput.files && screenshotFileInput.files[0]);
  });

  screenshotDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    screenshotDropzone.classList.add("drag-over");
  });

  screenshotDropzone.addEventListener("dragleave", () => {
    screenshotDropzone.classList.remove("drag-over");
  });

  screenshotDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    screenshotDropzone.classList.remove("drag-over");
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    handleScreenshotFile(file);
  });

  screenshotApplyBtn.addEventListener("click", handleApplyScreenshotFields);

  screenshotOriginalImgBtn.addEventListener("click", () => {
    if (screenshotOriginalImg.src) openLightbox(screenshotOriginalImg.src);
  });

  screenshotLightboxClose.addEventListener("click", closeLightbox);
  screenshotLightbox.addEventListener("click", (event) => {
    if (event.target === screenshotLightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !screenshotLightbox.hidden) closeLightbox();
  });

  for (const radio of deliveryTargetRadios) {
    radio.addEventListener("change", () => {
      alternativeEmailField.hidden = selectedDeliveryTarget() !== "alternative";
    });
  }

  generateBtn.addEventListener("click", handleGenerate);
  deliverySendBtn.addEventListener("click", handleSendDelivery);
}
