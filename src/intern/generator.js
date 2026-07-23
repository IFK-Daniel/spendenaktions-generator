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
import { shouldShowFieldCrop } from "../../core/screenshot/shouldShowFieldCrop.js";
import { buildUncertainCharacterHint } from "../../core/screenshot/buildUncertainCharacterHint.js";
import { firstUncertainCharacterIndex } from "../../core/screenshot/firstUncertainCharacterIndex.js";

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
  const screenshotApplyEditHint = document.getElementById("screenshot-apply-edit-hint");
  const screenshotShowOriginalBtn = document.getElementById("screenshot-show-original-btn");
  const screenshotSourceImg = document.getElementById("screenshot-source-img");
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
  // Zeichengenaue Rohdaten je Feld, einmalig beim Rendern der Vorschau
  // erfasst und danach unverändert — bleibt auch nach einer manuellen
  // Korrektur die Grundlage für den Unsicherheits-Hinweis und die
  // Cursor-Position beim erneuten Bearbeiten (der aktuelle `field.chars`
  // wird nach einer Bearbeitung nicht mehr verlässlich zum Wert passen).
  let initialFieldChars = new Map();
  // Genau ein Feld kann gleichzeitig bearbeitet werden — vereinfacht
  // "zentrale Übernahme währenddessen deaktivieren" auf eine einzige
  // Prüfung und verhindert, dass eine zweite Bearbeitung eine erste,
  // unbestätigte Änderung stillschweigend verwirft.
  let activeEditingKey = null;

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

  // `isLightboxClosing`/aktueller `hidden`-Zustand verhindern, dass ein
  // Klick, der gleichzeitig auf Bild UND Hintergrund "trifft" (Bubbling),
  // `closeLightbox` mehrfach auslöst — jeder Handler prüft, ob die
  // Lightbox überhaupt noch offen ist, bevor er reagiert.
  function openLightbox(src) {
    screenshotLightboxImg.src = src;
    screenshotLightbox.hidden = false;
  }

  function closeLightbox() {
    if (screenshotLightbox.hidden) return;
    screenshotLightbox.hidden = true;
    screenshotLightboxImg.src = "";
  }

  function clearOriginalScreenshot() {
    if (lastScreenshotObjectUrl) {
      URL.revokeObjectURL(lastScreenshotObjectUrl);
      lastScreenshotObjectUrl = null;
    }
    screenshotSourceImg.src = "";
  }

  // Lädt den hochgeladenen Screenshot ausschließlich als Quelle für
  // Lightbox und Bildausschnitte (Original bleibt lokal im Browser —
  // keine Speicherung, keine Übertragung). Wird standardmäßig NICHT
  // groß angezeigt; nur über den Button "Original-Screenshot anzeigen"
  // oder einen Feld-Ausschnitt sichtbar gemacht. Löst erst auf, sobald
  // das Bild geladen ist, damit `naturalWidth`/`naturalHeight` für die
  // Bildausschnitte (siehe `cropFieldRegion`) zuverlässig verfügbar
  // sind. Ein zuvor erzeugtes Object-URL wird vor dem Erstellen eines
  // neuen sauber freigegeben.
  function loadScreenshotSource(file) {
    return new Promise((resolve) => {
      clearOriginalScreenshot();
      const objectUrl = URL.createObjectURL(file);
      lastScreenshotObjectUrl = objectUrl;

      screenshotSourceImg.onload = () => resolve();
      screenshotSourceImg.onerror = () => resolve();
      screenshotSourceImg.src = objectUrl;
    });
  }

  // Erzeugt für ein prüfbedürftiges Feld mit bekannter Bounding-Box
  // einen deutlich vergrößerten Bildausschnitt der zugehörigen
  // Originalzeile (mit etwas Rand) aus dem bereits geladenen
  // Original-Screenshot — rein clientseitig über Canvas, keine erneute
  // Bildübertragung. `targetWidth` orientiert sich an der verfügbaren
  // Wertespalten-Breite, damit die Originalschrift gut lesbar ist,
  // ohne die Tabellenstruktur zu sprengen. Liefert `null`, wenn keine
  // verlässliche Bounding-Box vorliegt (siehe `core/screenshot/
  // computeCropRectangle.js`); dann wird bewusst kein künstlicher
  // Ausschnitt erzeugt.
  function cropFieldRegion(bbox, targetWidth = 480) {
    if (!screenshotSourceImg.naturalWidth || !screenshotSourceImg.naturalHeight) return null;

    const rect = computeCropRectangle(bbox, screenshotSourceImg.naturalWidth, screenshotSourceImg.naturalHeight);
    if (!rect) return null;

    const scale = Math.min(8, Math.max(1, targetWidth / rect.width));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      screenshotSourceImg,
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
    manuallyReviewedFieldKeys = new Set();
    initialFieldChars = new Map();
    activeEditingKey = null;
    updateApplyButtonState();
  }

  // Ermittelt die zeichengenauen Rohdaten eines Felds für die initiale
  // Snapshot-Erfassung (`initialFieldChars`). Die
  // E-Mail-für-Formular-Zeile übernimmt unverändert den Wert des
  // ausgewählten Quellfelds (IFK-Mailadresse oder normale
  // Mail-Adresse) — Zeichen-Markierungen werden entsprechend
  // gespiegelt, damit auch dort nur die tatsächlich unsicheren Zeichen
  // hervorgehoben werden.
  function fieldCharsForKey(fields, key) {
    const field = fields[key];
    if (!field) return undefined;
    if (Array.isArray(field.chars)) return field.chars;
    if (key === "emailForForm" && field.source) {
      const sourceField = fields[field.source];
      if (sourceField && Array.isArray(sourceField.chars) && sourceField.value === field.value) {
        return sourceField.chars;
      }
    }
    return undefined;
  }

  function hasReviewUI(key) {
    return initialFieldChars.has(key);
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

  function updateApplyButtonState() {
    const isEditing = activeEditingKey !== null;
    screenshotApplyBtn.disabled = isEditing;
    screenshotApplyEditHint.hidden = !isEditing;
  }

  // Fügt für ein prüfbedürftiges Feld mit verlässlicher Bounding-Box
  // einen deutlich vergrößerten, anklickbaren Bildausschnitt an —
  // ausschließlich für `needs_review` (siehe `shouldShowFieldCrop`):
  // erkannte Felder und "Neu generieren" (`confirmed_empty`) erhalten
  // bewusst keinen Ausschnitt, da nichts zu prüfen ist. Ein Klick auf
  // den Ausschnitt öffnet genau diesen (nicht den vollständigen
  // Screenshot, nicht die laufende Bearbeitung) groß in der Lightbox —
  // unabhängig davon, ob das Feld gerade bearbeitet wird.
  function appendFieldCropIfAvailable(container, field) {
    if (!shouldShowFieldCrop(field)) return;

    const dataUrl = cropFieldRegion(field.bbox);
    if (!dataUrl) return;

    const cropBtn = document.createElement("button");
    cropBtn.type = "button";
    cropBtn.className = "screenshot-field-crop-btn";
    cropBtn.title = "Ausschnitt vergrößern";

    const crop = document.createElement("img");
    crop.className = "screenshot-field-crop";
    crop.src = dataUrl;
    crop.alt = "Vergrößerter Ausschnitt der Originalzeile";
    cropBtn.appendChild(crop);

    cropBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openLightbox(dataUrl);
    });

    container.appendChild(cropBtn);
  }

  function buildCompareHint() {
    const hint = document.createElement("p");
    hint.className = "screenshot-value-review-hint";
    hint.textContent = "Bitte markiertes Zeichen mit dem Original vergleichen.";
    return hint;
  }

  function renderValueCell(valueCell, statusCell, fields, key) {
    const field = fields[key];
    valueCell.innerHTML = "";

    if (!hasReviewUI(key)) {
      valueCell.appendChild(document.createTextNode(field.value ? displayValueForKey(key, field.value) : "—"));
      appendFieldCropIfAvailable(valueCell, field);
      return;
    }

    if (activeEditingKey === key) {
      renderEditMode(valueCell, statusCell, fields, key);
      return;
    }

    renderReviewDisplay(valueCell, statusCell, fields, key);
  }

  // Anzeige-Modus eines Felds mit Korrekturmöglichkeit: vor der ersten
  // Bearbeitung mit hervorgehobenen unsicheren Zeichen, danach mit dem
  // (nun bestätigten) Wert als Klartext — in beiden Fällen bleibt eine
  // deutlich sichtbare "Korrigieren"-Aktion vorhanden (kein reiner
  // Hover-Zustand, funktioniert daher auch auf Touch-Geräten), und der
  // Bildausschnitt bleibt zur Kontrolle sichtbar.
  function renderReviewDisplay(valueCell, statusCell, fields, key) {
    const field = fields[key];
    const showHighlight = !manuallyReviewedFieldKeys.has(key) && Array.isArray(field.chars);

    const container = document.createElement("div");
    container.className = "screenshot-value-review";

    const valueRow = document.createElement("div");
    valueRow.className = "screenshot-value-row";

    const valueDisplay = document.createElement("span");
    valueDisplay.className = "screenshot-value-editable";
    valueDisplay.title = "Zum Bearbeiten anklicken";
    if (!field.value) {
      valueDisplay.appendChild(document.createTextNode("—"));
    } else if (showHighlight) {
      for (const { char, uncertain } of field.chars) {
        const charSpan = document.createElement("span");
        charSpan.textContent = char;
        if (uncertain) charSpan.className = "screenshot-char-uncertain";
        valueDisplay.appendChild(charSpan);
      }
    } else {
      valueDisplay.appendChild(document.createTextNode(displayValueForKey(key, field.value)));
    }
    valueDisplay.addEventListener("click", () => openEditMode(fields, key, valueCell, statusCell));
    valueRow.appendChild(valueDisplay);

    const correctBtn = document.createElement("button");
    correctBtn.type = "button";
    correctBtn.className = "screenshot-correct-btn";
    const correctIcon = document.createElement("span");
    correctIcon.className = "screenshot-correct-icon";
    correctIcon.setAttribute("aria-hidden", "true");
    correctIcon.textContent = "✎";
    correctBtn.appendChild(correctIcon);
    correctBtn.appendChild(document.createTextNode("Korrigieren"));
    correctBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openEditMode(fields, key, valueCell, statusCell);
    });
    valueRow.appendChild(correctBtn);

    container.appendChild(valueRow);

    if (showHighlight) {
      container.appendChild(buildCompareHint());
    }

    appendFieldCropIfAvailable(container, field);
    valueCell.appendChild(container);
  }

  // Bearbeitungsmodus: Eingabefeld, Vergleichs-/Unsicherheitshinweis
  // und Originalausschnitt bleiben gemeinsam sichtbar (in dieser
  // Reihenfolge) — der Nutzer muss sich das zu prüfende Zeichen nicht
  // merken. Endet ausschließlich über die bewussten Aktionen
  // "Änderung übernehmen"/"Abbrechen" (bzw. Enter/Escape) — nie durch
  // bloßen Fokusverlust, damit ein Klick auf den Ausschnitt/die
  // Lightbox die Bearbeitung nicht versehentlich beendet.
  function renderEditMode(valueCell, statusCell, fields, key) {
    const field = fields[key];
    const initialChars = initialFieldChars.get(key);

    const container = document.createElement("div");
    container.className = "screenshot-value-review screenshot-value-review-editing";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "screenshot-value-edit-input";
    input.value = field.value;
    container.appendChild(input);

    container.appendChild(buildCompareHint());

    const uncertainHintText = buildUncertainCharacterHint(initialChars);
    if (uncertainHintText) {
      const uncertainHint = document.createElement("p");
      uncertainHint.className = "screenshot-value-review-hint screenshot-value-review-hint-uncertain";
      uncertainHint.textContent = uncertainHintText;
      container.appendChild(uncertainHint);
    }

    appendFieldCropIfAvailable(container, field);

    const actions = document.createElement("div");
    actions.className = "screenshot-edit-actions";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "screenshot-edit-confirm";
    confirmBtn.textContent = "Änderung übernehmen";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "screenshot-edit-cancel";
    cancelBtn.textContent = "Abbrechen";

    const commitEdit = () => {
      field.value = input.value.trim();
      manuallyReviewedFieldKeys.add(key);
      activeEditingKey = null;
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, field.status);
      updateApplyButtonState();
    };

    const cancelEdit = () => {
      activeEditingKey = null;
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, field.status);
      updateApplyButtonState();
    };

    confirmBtn.addEventListener("click", commitEdit);
    cancelBtn.addEventListener("click", cancelEdit);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEdit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
    });

    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    container.appendChild(actions);

    valueCell.appendChild(container);

    input.focus();
    const uncertainIndex = firstUncertainCharacterIndex(initialChars);
    if (uncertainIndex !== -1 && uncertainIndex < input.value.length) {
      input.setSelectionRange(uncertainIndex, uncertainIndex + 1);
    } else {
      input.select();
    }
  }

  function openEditMode(fields, key, valueCell, statusCell) {
    if (activeEditingKey !== null) return;
    activeEditingKey = key;
    renderValueCell(valueCell, statusCell, fields, key);
    updateApplyButtonState();
  }

  function renderScreenshotPreview(fields) {
    screenshotPreviewBody.innerHTML = "";
    manuallyReviewedFieldKeys = new Set();
    initialFieldChars = new Map();
    activeEditingKey = null;

    for (const key of Object.keys(SCREENSHOT_FIELD_LABELS)) {
      const field = fields[key];
      if (!field) continue;
      const chars = fieldCharsForKey(fields, key);
      if (Array.isArray(chars)) initialFieldChars.set(key, chars);
    }

    for (const key of Object.keys(SCREENSHOT_FIELD_LABELS)) {
      const field = fields[key];
      if (!field) continue;

      const row = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.textContent = SCREENSHOT_FIELD_LABELS[key];
      row.appendChild(labelCell);

      const valueCell = document.createElement("td");
      valueCell.dataset.label = "Erkannter Wert";
      const statusCell = document.createElement("td");
      statusCell.dataset.label = "Status";

      const statusValue = key === "emailForForm" ? (field.source ? "recognized" : "needs_review") : field.status;
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, statusValue);

      row.appendChild(valueCell);
      row.appendChild(statusCell);

      screenshotPreviewBody.appendChild(row);
    }

    updateApplyButtonState();
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
        await loadScreenshotSource(file);
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
    // Zusätzliche, defensive Absicherung — der Button ist während einer
    // offenen Korrektur bereits deaktiviert (`updateApplyButtonState`),
    // damit eine noch unbestätigte Änderung nie stillschweigend
    // übernommen wird.
    if (activeEditingKey !== null) return;

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
      updateIfkIdGenerateBtnEmphasis();
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

  function updateIfkIdGenerateBtnEmphasis() {
    ifkIdGenerateBtn.classList.toggle("ifk-id-generate-btn--secondary", ifkIdInput.value.trim().length > 0);
  }

  ifkIdGenerateBtn.addEventListener("click", () => {
    // Eine bereits vorhandene IFK-ID (manuell eingetragen oder aus dem
    // Screenshot übernommen) wird nie ohne Rückfrage überschrieben.
    if (ifkIdInput.value.trim()) {
      const confirmed = window.confirm(
        "Es ist bereits eine IFK-ID eingetragen. Soll sie durch eine neu generierte ID ersetzt werden?"
      );
      if (!confirmed) return;
    }
    ifkIdInput.value = generateIfkId();
    updateIfkIdGenerateBtnEmphasis();
  });

  ifkIdInput.addEventListener("input", updateIfkIdGenerateBtnEmphasis);
  updateIfkIdGenerateBtnEmphasis();

  screenshotSelectBtn.addEventListener("click", () => screenshotFileInput.click());

  // Die gesamte Dropzone soll als Upload-Ziel klickbar sein, nicht nur
  // der Button — ein Klick auf den Button selbst darf den Dateidialog
  // aber nicht doppelt öffnen.
  screenshotDropzone.addEventListener("click", (event) => {
    if (event.target === screenshotSelectBtn) return;
    screenshotFileInput.click();
  });

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

  screenshotShowOriginalBtn.addEventListener("click", () => {
    if (screenshotSourceImg.src) openLightbox(screenshotSourceImg.src);
  });

  // Die Lightbox lässt sich auf vier Wegen schließen: X-Button, Klick
  // auf das vergrößerte Bild selbst, Klick auf den dunklen Hintergrund
  // und Escape. `closeLightbox()` ist bewusst idempotent (früher
  // Ausstieg, falls bereits geschlossen) und jeder Bild-/Button-Klick
  // stoppt die Propagation zum Hintergrund-Handler — so löst ein
  // einzelner Klick nie mehrfach ein Schließen aus.
  screenshotLightboxClose.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });
  screenshotLightboxImg.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });
  screenshotLightbox.addEventListener("click", () => closeLightbox());
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
