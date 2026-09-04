import logoUrl from "../../Medien/IFK Logo nur Zähne.png";
import { generateIfkId } from "../../core/id/generateIfkId.js";
import { validateIfkId } from "../../core/id/validateIfkId.js";
import { isIfkIdComplete } from "../../core/id/isIfkIdComplete.js";
import { isValidEmail } from "../../core/mail/validateEmail.js";
import { sendRepresentativeMaterials } from "../../core/mail/sendRepresentativeMaterials.js";
import { buildMaterialManifest } from "../../core/materials/buildMaterialManifest.js";
import { buildMaterialZip } from "../../core/materials/buildMaterialZip.js";
import {
  buildRepresentativeDeliveryRequest,
  resolveCompanionRecipient,
  RECIPIENT_ERROR_CODES,
} from "../../core/materials/buildRepresentativeDeliveryRequest.js";
import { generateQrMaterials } from "../../core/materials/generateQrMaterials.js";
import { generateFlyerMaterial } from "../../core/materials/generateFlyerMaterial.js";
import { generateFlyerHomeSheet } from "../../core/materials/generateFlyerHomeSheet.js";
import { buildFlyerVariantEntries } from "../../core/materials/buildFlyerVariantEntries.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../../core/materials/resolveRepresentativeFlyerFrontTemplate.js";
import { generateCompanionMaterialGuide } from "../../core/materials/generateCompanionMaterialGuide.js";
import { loadFontFileBrowser } from "../../core/pdf/loadFontFileBrowser.js";
import { generateCertificateMaterial } from "../../core/materials/generateCertificateMaterial.js";
import {
  MATERIAL_TYPE_KEYS,
  MATERIAL_TYPES_BY_KEY,
  CERTIFICATE_MATERIAL_KEYS,
} from "../../core/materials/materialTypes.js";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  getRequiredFieldsForMaterial,
  getRequiredFieldsForMaterials,
  getMissingFields,
} from "../../core/materials/materialRequirements.js";
import { fetchRepresentativePhoto } from "../../core/photo/fetchRepresentativePhoto.js";
import { getPhotoRetrievalErrorMessage } from "../../core/photo/getPhotoRetrievalErrorMessage.js";
import { normalizePhotoToPng } from "../../core/photo/normalizePhotoToPng.js";
import { isPhotoLinkValidated } from "../../core/photo/isPhotoLinkValidated.js";
import { DEFAULT_PHOTO_CROP } from "../../core/pdf/photoCrop.js";
import { extractPaypalLink } from "../../core/text/extractPaypalLink.js";
import { isHttpUrl } from "../../core/text/isHttpUrl.js";
import { initPhotoCropEditor } from "./photoCropEditor.js";
import { loadTemplateAssetsBrowser } from "../../core/pdf/loadTemplateAssetsBrowser.js";
import { flyerRepresentativeFemaleDuFrontTemplate } from "../../templates/flyer-representative-female-du-front/template.config.js";
import { flyerRepresentativeFemaleSieFrontTemplate } from "../../templates/flyer-representative-female-sie-front/template.config.js";
import { flyerRepresentativeMaleDuFrontTemplate } from "../../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../../templates/flyer-shared-back/template.config.js";
import { flyerRepresentativeFemaleDuPrintTemplate } from "../../templates/flyer-representative-female-du-print/template.config.js";
import { flyerRepresentativeFemaleSiePrintTemplate } from "../../templates/flyer-representative-female-sie-print/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../../templates/flyer-representative-male-du-print/template.config.js";
import { flyerRepresentativeMaleSiePrintTemplate } from "../../templates/flyer-representative-male-sie-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../../templates/flyer-shared-back-print/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../../templates/certificate-representative-male/template.config.js";
import { certificateRepresentativeFemaleTemplate } from "../../templates/certificate-representative-female/template.config.js";
import { certificateAmbassadorMaleTemplate } from "../../templates/certificate-ambassador-male/template.config.js";
import { certificateAmbassadorFemaleTemplate } from "../../templates/certificate-ambassador-female/template.config.js";
import { certificateAdvisoryBoardTemplate } from "../../templates/certificate-advisory-board/template.config.js";
import { certificateCuratoriumTemplate } from "../../templates/certificate-curatorium/template.config.js";
import { certificateExpertCouncilTemplate } from "../../templates/certificate-expert-council/template.config.js";
import { certificateEconomicCouncilTemplate } from "../../templates/certificate-economic-council/template.config.js";
import { resolveCertificateTemplateVariant } from "../../core/materials/resolveCertificateTemplateVariant.js";
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
import { isFieldAutoRecognized } from "../../core/screenshot/isFieldAutoRecognized.js";
import {
  ROLE_KEY_LIST,
  getRoleConfig,
  roleRequiresRegion,
  getCertificateMaterialKey,
  certificateRequiresGender,
  isFlyerTemplateAvailableForRole,
  isCertificateTemplateAvailableForRole,
} from "../../core/materials/roleConfig.js";

const PAYPAL_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK]);
const GIRO_KEYS = new Set([MATERIAL_TYPE_KEYS.QR_GIRO_BLACK]);
const FLYER_KEYS = new Set([MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI, MATERIAL_TYPE_KEYS.FLYER_HOME]);

// Frühere globale Flyer-Sperre — seit Integration der vier final
// korrigierten Repräsentanten-Master (Sept. 2026, siehe
// `templates/flyer-representative-*-front/` und
// `templates/flyer-shared-back/`) aufgehoben. Die Konstante bleibt als
// Not-Schalter erhalten (`true` sperrt die Flyer-Erzeugung wieder für
// jeden Wegbegleiter-Typ); die rollenabhängige Vorlagen-Verfügbarkeit
// (`roleConfig.js`, `flyerMaterialKeys`) ist davon unberührt.
const FLYERS_TEMPORARILY_DISABLED = false;
const FLYER_DISABLED_HINT = "Flyer-Erzeugung ist derzeit deaktiviert (Vorlagen in Überarbeitung).";
// Alle Urkunden-Materialschlüssel (je Wegbegleiter-Typ genau einer,
// siehe `core/materials/materialTypes.js`) — bewusst aus der zentralen
// Definition abgeleitet statt hier einzeln aufgezählt.
const CERTIFICATE_KEYS = new Set(CERTIFICATE_MATERIAL_KEYS);

// Repräsentanten-Flyer-VORDERSEITE, je AUSGABEART:
// - HOME (Bildschirm-/Trimformat, 148×210mm, kein Beschnitt) — wird
//   unskaliert zweimal auf einen DIN-A4-Bogen imponiert, siehe
//   `generateFlyerHomeSheet`.
// - DRUCKEREI (150×212mm, 1mm Beschnitt gemäß Flyeralarm-Datenblatt
//   `Medien/flyer_a5_mass.pdf`, siehe
//   `templates/_shared/representativeFlyerPrintBase.js`).
// Beide Tabellen sind Geschlecht × Ansprache, mit derselben zentralen
// Auflösung (`resolveRepresentativeFlyerFrontTemplate`) — Ansprache ist
// KEINE Nutzerauswahl, `buildFlyerVariantEntries` erzeugt automatisch
// beide Varianten je gewähltem Flyer-Material.
const REPRESENTATIVE_FLYER_FRONT_TEMPLATES_HOME = Object.freeze({
  female: Object.freeze({
    du: flyerRepresentativeFemaleDuFrontTemplate,
    sie: flyerRepresentativeFemaleSieFrontTemplate,
  }),
  male: Object.freeze({
    du: flyerRepresentativeMaleDuFrontTemplate,
    sie: flyerRepresentativeMaleSieFrontTemplate,
  }),
});
const REPRESENTATIVE_FLYER_FRONT_TEMPLATES_PRINT = Object.freeze({
  female: Object.freeze({
    du: flyerRepresentativeFemaleDuPrintTemplate,
    sie: flyerRepresentativeFemaleSiePrintTemplate,
  }),
  male: Object.freeze({
    du: flyerRepresentativeMaleDuPrintTemplate,
    sie: flyerRepresentativeMaleSiePrintTemplate,
  }),
});

/**
 * Wählt Vorderseiten-Tabelle UND Rückseite anhand der Ausgabeart
 * (`entry.key`) — die eine zentrale Stelle, die weiß, dass Druckerei
 * die Beschnitt-Fassung braucht und Home die Trimformat-Fassung (für
 * die Imposition). `resolveRepresentativeFlyerFrontTemplate` selbst
 * bleibt unverändert Geschlecht/Ansprache-only (kein Fallback).
 */
function resolveFlyerFrontTemplateForJob(materialKey, gender, salutation) {
  const table =
    materialKey === MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI
      ? REPRESENTATIVE_FLYER_FRONT_TEMPLATES_PRINT
      : REPRESENTATIVE_FLYER_FRONT_TEMPLATES_HOME;
  return resolveRepresentativeFlyerFrontTemplate(table, gender, salutation);
}

// Flyer-RÜCKSEITE: EINE gemeinsame, rollen-, geschlechts- und
// ansprache-unabhängige Vorlage — je Ausgabeart in Trimformat
// (`templates/flyer-shared-back/`, für Home) oder mit Beschnitt
// (`templates/flyer-shared-back-print/`, für Druckerei). Vorbereitet
// für künftige Wegbegleiter-Flyer (siehe `roleConfig.js`,
// `getFlyerBackTemplateKey`). Kein Materialschlüssel- oder
// Geschlechts-Mapping mehr, keine vier Kopien derselben Datei.
function resolveFlyerBackTemplateForJob(materialKey) {
  return materialKey === MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI ? sharedFlyerBackPrintTemplate : sharedFlyerBackTemplate;
}

const FLYER_DOWNLOAD_LABEL_BY_KEY = Object.freeze({
  [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI]: "Druck-PDF herunterladen",
  [MATERIAL_TYPE_KEYS.FLYER_HOME]: "PDF herunterladen",
});

// Urkunden-Vorlagen je Materialschlüssel. `{ neutral }` = genau eine
// geschlechtsneutrale Vorlage (Beirat/Kuratorium/Fachrat/Wirtschaftsrat);
// `{ male, female }` = zwei geschlechtsspezifische Vorlagen
// (Repräsentant, Botschafter — die Master-PDFs enthalten unterschiedlichen
// Text). Der Renderer (`renderFlyer.js`) kennt kein Geschlecht — die
// Auswahl passiert vollständig hier über `resolveCertificateTemplate`,
// vor dem Rendern. Kein Fallback: eine unbekannte Rolle bzw. eine
// geschlechtsspezifische Urkunde ohne `gender` wirft (siehe
// `core/materials/resolveCertificateTemplateVariant.js`).
//
// Eine weitere Wegbegleiter-Urkunde ergänzen = neue PDF unter
// `templates/certificate-…/`, neue `template.config.js`, ein Eintrag
// hier und das Rollen-Mapping in `core/materials/roleConfig.js` — sonst
// nichts in dieser Datei.
const CERTIFICATE_TEMPLATES_BY_KEY = Object.freeze({
  [MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE]: Object.freeze({
    male: certificateRepresentativeMaleTemplate,
    female: certificateRepresentativeFemaleTemplate,
  }),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_AMBASSADOR]: Object.freeze({
    male: certificateAmbassadorMaleTemplate,
    female: certificateAmbassadorFemaleTemplate,
  }),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_ADVISORY_BOARD]: Object.freeze({
    neutral: certificateAdvisoryBoardTemplate,
  }),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_CURATORIUM]: Object.freeze({
    neutral: certificateCuratoriumTemplate,
  }),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_EXPERT_COUNCIL]: Object.freeze({
    neutral: certificateExpertCouncilTemplate,
  }),
  [MATERIAL_TYPE_KEYS.CERTIFICATE_ECONOMIC_COUNCIL]: Object.freeze({
    neutral: certificateEconomicCouncilTemplate,
  }),
});

function resolveCertificateTemplate(materialKey, gender) {
  return resolveCertificateTemplateVariant(CERTIFICATE_TEMPLATES_BY_KEY[materialKey], gender);
}

// Baut die zusammengefasste, blockierende Fehlermeldung, wenn KEIN
// ausgewähltes Material erzeugt werden kann (siehe `handleGenerate`
// weiter unten sowie Vorgabe Abschnitt 10) — nennt jedes fehlende Feld
// nur genau einmal, nie pro Material wiederholt. DOM-frei und daher
// unabhängig testbar.
function buildMissingFieldsMessage(materialKeys, missingFieldKeys) {
  const bulletList = missingFieldKeys.map((key) => `- ${FIELD_LABELS[key]}`).join("\n");
  if (materialKeys.length === 1) {
    const label = MATERIAL_TYPES_BY_KEY[materialKeys[0]]?.label || materialKeys[0];
    return `Für ${label} fehlen noch:\n${bulletList}`;
  }
  return `Für die ausgewählten Materialien fehlen noch:\n${bulletList}`;
}

// Kurze, deutsche Aufzählung von Feldbezeichnungen für die nicht-
// blockierenden Hinweise, wenn ein einzelnes Material trotz
// unabhängiger Erzeugung übersprungen werden musste (Vorgabe Abschnitt 11).
function describeFieldList(fieldKeys) {
  return fieldKeys.map((key) => FIELD_LABELS[key]).join(", ");
}

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

// Rollenabhängiger Wortlaut im Screenshot-Import-Hinweis
// ("Screenshot des humbee-…vorgangs hochladen"). Bewusst als
// UI-Zeichenketten hier (nicht in `core/materials/roleConfig.js`, das
// DOM-/UI-frei bleibt) — die Formen spiegeln die sichtbaren
// Dropdown-Bezeichnungen wider (deutsche Fugen-/Genitivformen lassen
// sich nicht zuverlässig automatisch ableiten). Fallback für unbekannte
// Rollen: die allgemeine Wegbegleiter-Form.
const SCREENSHOT_PROCESS_NOUN_BY_ROLE = {
  representative: "humbee-Repräsentantenvorgangs",
  ambassador: "humbee-Botschaftervorgangs",
  economic_council: "humbee-Wirtschaftsratsvorgangs",
  expert_council: "humbee-Fachratsvorgangs",
  curator: "humbee-Kuratorvorgangs",
  advisory_board: "humbee-Beiratsvorgangs",
};
const SCREENSHOT_PROCESS_NOUN_FALLBACK = "humbee-Wegbegleiter-Vorgangs";

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
  const roleSelect = document.getElementById("role-select");
  const firstNameInput = document.getElementById("first-name-input");
  const lastNameInput = document.getElementById("last-name-input");
  const ifkIdInput = document.getElementById("ifk-id-input");
  const ifkIdGenerateBtn = document.getElementById("ifk-id-generate-btn");
  // "intern-email-input", nicht "email-input" — siehe Kommentar in
  // intern/index.html (Kollision mit der ID-Regel `#email-input` in
  // der zusätzlich geladenen /src/style.css der öffentlichen Seite).
  const emailInput = document.getElementById("intern-email-input");
  const phoneInput = document.getElementById("phone-input");
  const photoUrlInput = document.getElementById("photo-url-input");
  const photoUrlField = document.getElementById("photo-url-field");
  const photoUrlErrorHint = document.getElementById("photo-url-error-hint");
  const federalStateField = document.getElementById("federal-state-field");
  const federalStateInput = document.getElementById("federal-state-input");
  const regionField = document.getElementById("region-field");
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
  const photoCropOpenBtn = document.getElementById("photo-crop-open-btn");
  const photoCropStatusEl = document.getElementById("photo-crop-status");
  const photoCropResetBtn = document.getElementById("photo-crop-reset-btn");
  const materialCheckboxes = Array.from(document.querySelectorAll("[data-material-key]"));
  // Flyer-Checkboxen: rollenabhängige Vorlagen-VERFÜGBARKEIT (für die
  // neuen Wegbegleiter-Typen fehlt die Flyer-Master-Vorlage noch —
  // deaktiviert + Hinweis, KEIN Fallback auf Repräsentanten-Flyer). Die
  // schwarzen QR-Checkboxen sind bewusst nicht enthalten (QR für jede
  // Rolle möglich, Vorgabe Abschnitt 9); die Urkunden-Checkbox ebenfalls
  // nicht — jede Rolle hat eine Urkundenvorlage, sie wird stattdessen
  // rollenabhängig UMKONFIGURIERT (`applyRoleToCertificateCheckbox`).
  const roleGatedMaterialCheckboxes = materialCheckboxes.filter((checkbox) =>
    checkbox.hasAttribute("data-material-flyer")
  );
  // Die eine Urkunden-Checkbox — ihr `data-material-key`, ihr sichtbarer
  // Titel und der "Geschlecht nötig"-Hinweis richten sich nach dem
  // gewählten Wegbegleiter-Typ (siehe `applyRoleToCertificateCheckbox`).
  const certificateCheckbox = document.querySelector("[data-material-certificate]");
  const certificateLabelEl = certificateCheckbox
    ?.closest(".material-item")
    ?.querySelector("[data-certificate-label]");
  const certificateGenderHintEl = certificateCheckbox
    ?.closest(".material-item")
    ?.querySelector("[data-default-hint]");

  // Aktuell ausgewählter Wegbegleiter-Typ — Default `representative`
  // entspricht dem bisherigen alleinigen Verhalten der Seite (Dropdown
  // steht trotzdem sichtbar ganz am Anfang, siehe intern/index.html).
  function selectedRoleKey() {
    return roleSelect.value;
  }

  // Blendet Bundesland/Region vollständig aus dem Formular aus (nicht
  // nur `required=false`) und deaktiviert die zugehörige Vorlagen-
  // Verfügbarkeit für Flyer/Urkunde, sobald eine andere Rolle als
  // `representative` gewählt ist — siehe `core/materials/roleConfig.js`.
  // Bereits eingetragene Werte bleiben beim Rollenwechsel erhalten
  // (nicht gelöscht), damit ein Zurückwechseln zu `representative`
  // keine Daten verliert.
  function applyRoleToForm() {
    const roleKey = selectedRoleKey();
    const requiresRegion = roleRequiresRegion(roleKey);
    federalStateField.hidden = !requiresRegion;
    regionField.hidden = !requiresRegion;
    updateMaterialAvailabilityForRole(roleKey);
    applyRoleToCertificateCheckbox(roleKey);
    // Screenshot-Import-Hinweis auf den gewählten Wegbegleiter-Typ
    // münzen ("Screenshot des humbee-Botschaftervorgangs hochladen").
    if (screenshotProcessNounEl) {
      screenshotProcessNounEl.textContent =
        SCREENSHOT_PROCESS_NOUN_BY_ROLE[roleKey] || SCREENSHOT_PROCESS_NOUN_FALLBACK;
    }
    updateRequiredFieldIndicators();
  }

  // Richtet die eine Urkunden-Checkbox auf den gewählten Wegbegleiter-
  // Typ aus: `data-material-key` auf dessen Urkunden-Schlüssel (steuert
  // Pflichtfelder, Manifest, Dateiname, Erzeugung — alles generisch über
  // diesen Schlüssel), sichtbarer Titel auf das Material-Label
  // (Repräsentantenurkunde / Botschafterurkunde / Urkunde Beirat …), und
  // der "Geschlecht nötig"-Hinweis nur für Rollen, deren Urkunde
  // geschlechtsspezifischen Text enthält (Repräsentant, Botschafter).
  function applyRoleToCertificateCheckbox(roleKey) {
    if (!certificateCheckbox) return;
    const certificateKey = getCertificateMaterialKey(roleKey);
    certificateCheckbox.dataset.materialKey = certificateKey;
    if (certificateLabelEl) {
      certificateLabelEl.textContent = MATERIAL_TYPES_BY_KEY[certificateKey]?.label || "Urkunde";
    }
    if (certificateGenderHintEl) {
      certificateGenderHintEl.hidden = !certificateRequiresGender(roleKey);
    }
  }

  // Ordnet jedem Personendaten-Feld sein sichtbares `<label>`/`<legend>`
  // zu — für den dezenten `*`-Pflichtfeld-Marker (Vorgabe Abschnitt 9),
  // NICHT für die eigentliche Validierung (die läuft ausschließlich über
  // `core/materials/materialRequirements.js`, siehe `handleGenerate`).
  const requiredFieldLabelElements = {
    [FIELD_KEYS.FIRST_NAME]: document.querySelector('label[for="first-name-input"]'),
    [FIELD_KEYS.LAST_NAME]: document.querySelector('label[for="last-name-input"]'),
    [FIELD_KEYS.GENDER]: document.querySelector(".gender-fieldset legend"),
    [FIELD_KEYS.IFK_ID]: document.querySelector('label[for="ifk-id-input"]'),
    [FIELD_KEYS.EMAIL]: document.querySelector('label[for="intern-email-input"]'),
    [FIELD_KEYS.PHONE]: document.querySelector('label[for="phone-input"]'),
    [FIELD_KEYS.FEDERAL_STATE]: document.querySelector('label[for="federal-state-input"]'),
    [FIELD_KEYS.REGION]: document.querySelector('label[for="region-input"]'),
    [FIELD_KEYS.PHOTO_URL]: document.querySelector('label[for="photo-url-input"]'),
    [FIELD_KEYS.PAYPAL_URL]: document.querySelector('label[for="paypal-input"]'),
  };

  // Bei jeder Änderung der Materialauswahl oder der Rolle neu berechnet
  // (siehe Aufrufer unten) — rein visueller Hinweis, welche Felder für
  // die AKTUELLE Auswahl benötigt werden (Vorgabe Abschnitt 9).
  function updateRequiredFieldIndicators() {
    const requiredFields = new Set(getRequiredFieldsForMaterials(selectedMaterialKeys(), selectedRoleKey()));
    for (const [fieldKey, labelEl] of Object.entries(requiredFieldLabelElements)) {
      labelEl?.classList.toggle("field-label--required", requiredFields.has(fieldKey));
    }
  }

  function updateMaterialAvailabilityForRole(roleKey) {
    for (const checkbox of roleGatedMaterialCheckboxes) {
      const materialKey = checkbox.dataset.materialKey;
      // Global gesperrt (siehe `FLYERS_TEMPORARILY_DISABLED`) ODER für
      // diese Rolle keine Flyer-Vorlage hinterlegt.
      const available =
        !FLYERS_TEMPORARILY_DISABLED && isFlyerTemplateAvailableForRole(roleKey, materialKey);

      const item = checkbox.closest(".material-item");
      const defaultHint = item?.querySelector("[data-default-hint]");
      const unavailableHint = item?.querySelector("[data-role-unavailable-hint]");

      checkbox.disabled = !available;
      if (!available) checkbox.checked = false;
      item?.classList.toggle("material-item-disabled", !available);
      if (defaultHint) defaultHint.hidden = !available;
      if (unavailableHint) {
        unavailableHint.hidden = available;
        // Bei globaler Sperre einen eindeutigen Grund anzeigen statt des
        // rollenbezogenen „…für diese Wegbegleiter-Art noch nicht
        // hinterlegt“-Texts (der bei Repräsentant sonst irreführend wäre).
        unavailableHint.textContent = FLYERS_TEMPORARILY_DISABLED
          ? FLYER_DISABLED_HINT
          : "Vorlage für diese Wegbegleiter-Art noch nicht hinterlegt.";
      }
    }
  }

  const screenshotDropzone = document.getElementById("screenshot-dropzone");
  const screenshotProcessNounEl = document.querySelector("[data-screenshot-process-noun]");
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
  // Ziel-Elemente für die grüne "importiert"-Hervorhebung — bewusst die
  // Eingabeelemente selbst (nicht ihre umgebenden Container/Labels/
  // Formulargruppen), damit nur das tatsächliche Feld grün hinterlegt
  // wird (siehe `.field-complete` in style.css). `gender` fehlt hier
  // bewusst: bei einer Radiogruppe ist "das Feld" keine einzelne feste
  // Element-Referenz, sondern je nach Wert eine von zwei Optionen —
  // siehe `genderOptionLabelFor()`/`setFieldImportedState()` unten.
  // "ifkId" bewusst NICHT enthalten — das Feld nutzt die separate
  // Erledigungsstatus-Logik (`updateIfkIdCompletionState()`), keine
  // Herkunfts-/Import-Markierung (siehe Kommentar dort).
  const fieldTargetElements = new Map([
    ["firstName", firstNameInput],
    ["lastName", lastNameInput],
    ["email", emailInput],
    ["phone", phoneInput],
    ["federalState", federalStateInput],
    ["region", regionInput],
    ["paypalUrl", paypalInput],
  ]);
  const fieldImportSourceElements = {
    firstName: [firstNameInput],
    lastName: [lastNameInput],
    gender: genderRadios,
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
  // Die Materialhinweise ("Hinweise zur Verwendung Deiner Materialien")
  // sind KEIN personenbezogenes, individuelles Material — sie werden je
  // erfolgreichem Erzeugungsdurchlauf genau EINMAL erzeugt (unabhängig
  // von der Anzahl erzeugter Du-/Sie-Varianten) und separat vorgehalten,
  // NICHT in `lastFiles` gemischt: `lastFiles` bleibt die Liste der
  // tatsächlich individuell erzeugten Materialien (Ergebnis-Karten,
  // humbee-Dokumentation); die Anleitung bekommt eine eigene Ergebnis-
  // karte und wird erst beim Versand zusätzlich ins ZIP an den
  // Wegbegleiter gepackt (siehe `renderResults`/`handleSendDelivery`).
  let lastGuideFile = null;
  let lastPhoto = null;
  // Foto-Link, zu dem `lastPhoto` gehört — erlaubt es, beim Öffnen des
  // Fotoausschnitt-Editors ein bereits geladenes Foto wiederzuverwenden,
  // statt es ein zweites Mal abzurufen (siehe `handleOpenPhotoCropEditor`).
  let lastPhotoUrl = null;
  // Manueller Fotoausschnitt (siehe `core/pdf/photoCrop.js`) — `null`
  // bedeutet "automatischer Center-Crop" (bisheriges Verhalten). Wird an
  // den Foto-Link gebunden, zu dem er gehört (`photoCropSourceUrl`), und
  // bei jedem Wechsel des Foto-Links verworfen (siehe Punkt 9 der Vorgabe).
  let photoCrop = null;
  let photoCropSourceUrl = null;
  let isPhotoCropEditorOpen = false;
  let isSending = false;
  let isGenerating = false;
  // Alle Object-URLs, die für die aktuell angezeigten Ergebnisse (Bild-
  // und PDF-Vorschauen) erzeugt wurden — werden vor jeder Neuerzeugung
  // und beim Verlassen der Seite freigegeben (siehe `revokeActiveObjectUrls`).
  let activeObjectUrls = [];
  let lastExtractionFields = null;
  let isExtractingScreenshot = false;
  // Felder, die der Nutzer über die Korrektur-Tabelle bestätigt hat —
  // UNABHÄNGIG davon, ob sich der Wert dabei tatsächlich geändert hat
  // (nötig für `isApplyable`: auch ein unverändert bestätigter
  // "prüfbedürftiger" Wert soll übernommen werden können). Eine über
  // diese Tabelle vorgenommene Korrektur eines unsicheren Zeichens gilt
  // weiterhin als "aus dem Screenshot übernommen" (grün) — sie ist Teil
  // des vorgesehenen Korrektur-Workflows, keine nachträgliche manuelle
  // Bearbeitung des fertigen Formularfelds (siehe `isAutoRecognized`).
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

  function showPhotoFieldError(message) {
    photoUrlField.classList.add("person-field--invalid");
    photoUrlErrorHint.textContent = message;
    photoUrlErrorHint.hidden = false;
    photoUrlInput.focus();
    photoUrlInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearPhotoFieldError() {
    photoUrlField.classList.remove("person-field--invalid");
    photoUrlErrorHint.hidden = true;
    photoUrlErrorHint.textContent = "";
  }

  // Gibt alle Object-URLs frei, die für zuvor angezeigte Ergebnisse
  // (Bild-/PDF-Vorschauen) erzeugt wurden — vor jeder Neuerzeugung und
  // beim Verlassen der Seite (siehe Aufrufer unten).
  function revokeActiveObjectUrls() {
    for (const url of activeObjectUrls) {
      URL.revokeObjectURL(url);
    }
    activeObjectUrls = [];
  }

  window.addEventListener("beforeunload", revokeActiveObjectUrls);

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
        lastPhotoUrl = photoUrl;
        const sizeKb = Math.max(1, Math.round(result.size / 1024));
        showPhotoStatus(`Foto erfolgreich geladen (${result.format}, ${sizeKb} KB).`, "success");
        showPhotoPreview(`data:${result.contentType};base64,${result.content}`);
      } else {
        lastPhoto = null;
        lastPhotoUrl = null;
        showPhotoStatus(getPhotoRetrievalErrorMessage(result.reason), "error");
      }
      updatePhotoLinkCompletionState();
    } catch {
      lastPhoto = null;
      lastPhotoUrl = null;
      updatePhotoLinkCompletionState();
      showPhotoStatus(getPhotoRetrievalErrorMessage(), "error");
    }
  }

  const photoCropEditor = initPhotoCropEditor();

  // Sichtbarer Status im Hauptformular (Punkt 6 der Vorgabe): Buttontext
  // und Hinweis richten sich danach, ob für den *aktuell eingetragenen*
  // Foto-Link ein manueller Ausschnitt gespeichert ist.
  function updatePhotoCropStatusUI() {
    const hasManualCrop = photoCrop !== null && photoCropSourceUrl === photoUrlInput.value.trim();
    photoCropOpenBtn.textContent = hasManualCrop ? "Fotoausschnitt erneut anpassen" : "Fotoausschnitt anpassen";
    photoCropStatusEl.hidden = !hasManualCrop;
    photoCropResetBtn.hidden = !hasManualCrop;
  }

  // Verwirft einen gespeicherten manuellen Ausschnitt — bei Wechsel des
  // Foto-Links (Punkt 9) oder über "Automatischen Ausschnitt
  // wiederherstellen" (Punkt 6).
  function resetPhotoCrop() {
    photoCrop = null;
    photoCropSourceUrl = null;
    updatePhotoCropStatusUI();
  }

  async function handleOpenPhotoCropEditor() {
    if (isPhotoCropEditorOpen) return;

    clearPhotoFieldError();
    const photoUrl = photoUrlInput.value.trim();
    if (!isHttpUrl(photoUrl)) {
      showPhotoFieldError("Bitte zuerst einen gültigen Foto-Link (http/https) eintragen.");
      return;
    }

    isPhotoCropEditorOpen = true;
    photoCropOpenBtn.disabled = true;
    const originalLabel = photoCropOpenBtn.textContent;
    photoCropOpenBtn.textContent = "Foto wird geladen …";

    try {
      // Bereits geladenes Foto für denselben Link wiederverwenden statt
      // ein zweites Mal abzurufen — keine parallele Ladelogik, sondern
      // derselbe `fetchRepresentativePhoto`-Aufruf wie beim Erstellen
      // der Materialien (siehe `handleGenerate`).
      if (!lastPhoto || lastPhotoUrl !== photoUrl) {
        const photoResult = await fetchRepresentativePhoto(photoUrl);
        if (!photoResult.ok) {
          showPhotoFieldError(getPhotoRetrievalErrorMessage(photoResult.reason));
          return;
        }
        lastPhoto = photoResult;
        lastPhotoUrl = photoUrl;
        updatePhotoLinkCompletionState();
      }

      const initialCrop = photoCropSourceUrl === photoUrl && photoCrop ? photoCrop : DEFAULT_PHOTO_CROP;
      const result = await photoCropEditor.open({
        imageSrc: `data:${lastPhoto.contentType};base64,${lastPhoto.content}`,
        initialCrop,
      });

      if (result.applied) {
        photoCrop = result.crop;
        photoCropSourceUrl = photoUrl;
      }
    } finally {
      isPhotoCropEditorOpen = false;
      photoCropOpenBtn.disabled = false;
      photoCropOpenBtn.textContent = originalLabel;
      updatePhotoCropStatusUI();
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

  function renderResults(person, files, guideFile) {
    revokeActiveObjectUrls();
    // `person.ifkId` ist nur gesetzt, wenn mindestens ein erzeugtes
    // Material sie tatsächlich benötigt (siehe `materialRequirements.js`)
    // — z. B. bei einer ausschließlich erzeugten Urkunde fehlt sie
    // bewusst, daher kein "(undefined)" in der Überschrift.
    resultPersonName.textContent = person.ifkId
      ? `${person.firstName} ${person.lastName} (${person.ifkId})`
      : `${person.firstName} ${person.lastName}`;
    resultGrid.innerHTML = "";

    for (const file of files) {
      resultGrid.appendChild(buildResultBlock(file));
    }

    // Materialhinweise: genau EINE Ergebniskarte, unabhängig von der
    // Anzahl erzeugter Du-/Sie-Varianten (Vorgabe Abschnitt 17) — daher
    // bewusst NICHT Teil der obigen `files`-Schleife, sondern separat
    // am Ende angehängt.
    if (guideFile) {
      resultGrid.appendChild(buildResultBlock(guideFile));
    }

    results.hidden = false;
  }

  function buildResultBlock(file) {
    const objectUrl = URL.createObjectURL(file.content);
    activeObjectUrls.push(objectUrl);

    const block = document.createElement("div");
    block.className = "result-block";

    const heading = document.createElement("h4");
    heading.textContent = file.label;
    block.appendChild(heading);

    if (file.format === "pdf") {
        // PDF-Ergebnisse (Flyer, Repräsentantenurkunde) nehmen im
        // Ergebnisraster doppelt so viel Breite ein wie eine QR-Karte
        // (siehe `#result-grid`/`.result-block--flyer` in style.css) —
        // rein layoutbezogen, ändert nichts an Erzeugung oder Download.
        block.classList.add("result-block--flyer");

        const preview = document.createElement("iframe");
        preview.className = "result-pdf-preview";
        preview.src = objectUrl;
        preview.title = `Vorschau: ${file.label}`;
        block.appendChild(preview);

        if (Array.isArray(file.warnings) && file.warnings.length > 0) {
          const warningBox = document.createElement("p");
          warningBox.className = "result-block-warning";
          warningBox.textContent =
            "Vorläufig, nicht pixelgenau: " + file.warnings.map((w) => w.reason).join(" ");
          block.appendChild(warningBox);
        }

        const actions = document.createElement("div");
        actions.className = "result-block-actions";

        // Zusätzlich zur eingebetteten Vorschau ein Link zum Öffnen in
        // einem eigenen Tab — eingebettete PDF-Voransichten verhalten
        // sich nicht in jedem Browser/jeder Umgebung gleich zuverlässig.
        //
        // Bekannte Grenze (Safari/WebKit): `file.content` ist ein
        // benanntes `File`-Objekt (siehe `buildFileContent.js`), damit
        // die Object-URL grundsätzlich einen Dateinamen trägt. Klickt
        // man direkt auf diesen Link (unser eigenes `download`-Attribut
        // unten), wird der Name in allen getesteten Browsern inkl.
        // Safari korrekt verwendet. Öffnet man stattdessen NUR diesen
        // Vorschau-Link und speichert danach über den systemeigenen
        // Speichern-Button von Safaris eingebautem PDF-Betrachter, wird
        // der Dateiname von WebKit selbst vergeben — Safari liest dabei
        // den Namen des `File`-Objekts der Blob-URL nicht aus (bekannte
        // WebKit-Einschränkung, nicht seitenseitig behebbar; es gibt
        // keine Web-Plattform-API, die einer bereits navigierten
        // Blob-URL nachträglich einen Dateinamen mitgeben kann). Ein
        // erzwungener Workaround (z. B. Einbetten in eine eigene
        // HTML-Zwischenseite) würde die native Safari-PDF-Ansicht
        // (Zoomen, Seiten-Navigation, echtes Drucken) ersetzen — dieser
        // Kompromiss wurde hier bewusst NICHT eingegangen.
        const openLink = document.createElement("a");
        openLink.className = "download-link";
        openLink.href = objectUrl;
        openLink.target = "_blank";
        openLink.rel = "noopener";
        openLink.textContent = "Vorschau in neuem Tab öffnen";
        actions.appendChild(openLink);

        const downloadLink = document.createElement("a");
        downloadLink.className = "download-link";
        downloadLink.href = objectUrl;
        downloadLink.download = file.filename;
        // Urkunden (jede Rolle) behalten den einheitlichen Button-Text
        // "Urkunde herunterladen" (Vorgabe Abschnitt 18); Flyer-Varianten
        // ihren jeweiligen Text.
        downloadLink.textContent =
          file.category === "certificate"
            ? "Urkunde herunterladen"
            : FLYER_DOWNLOAD_LABEL_BY_KEY[file.key] || "PDF herunterladen";
        actions.appendChild(downloadLink);

        block.appendChild(actions);
      } else {
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
      }

    return block;
  }

  async function handleSendDelivery() {
    if (isSending) return;

    clearDeliveryError();

    if (!lastManifest || !lastFiles || lastFiles.length === 0) {
      showDeliveryError("Bitte zuerst Materialien erstellen.");
      return;
    }

    const target = selectedDeliveryTarget();
    // Immer die AKTUELL im Formular sichtbaren Werte verwenden — nie den
    // zum Zeitpunkt der Materialerzeugung gespeicherten Stand
    // (`lastManifest.person` trägt E-Mail/IFK-ID nur, wenn ein darauf
    // angewiesenes Material erzeugt wurde) und keinen alten
    // Screenshot-/OCR-Wert.
    //
    // Ein einziger, empfängerunabhängiger Wegbegleiter-Datensatz für
    // beide Versandwege: Typ, Name, IFK-ID und Formular-E-Mail gehören
    // zur Person und ändern sich NICHT, wenn an eine abweichende Adresse
    // versendet wird. Nur `alternativeEmail` steuert den Empfänger.
    const ifkIdCheck = validateIfkId(ifkIdInput.value);
    const companion = {
      role: roleSelect.value,
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      gender: (document.querySelector('input[name="gender"]:checked') || {}).value || undefined,
      // Vorhandene IFK-ID: exakt der aktuelle Wert (normalisiert, wenn
      // gültig). Leeres Feld → weglassen (kein "undefined" in der Mail).
      ifkId: ifkIdCheck.valid ? ifkIdCheck.normalized : ifkIdInput.value.trim() || undefined,
      email: emailInput.value.trim() || undefined,
      federalState: federalStateInput.value.trim() || undefined,
      region: regionInput.value.trim() || undefined,
    };
    const companionEmail = companion.email ?? "";
    const alternativeEmail = target === "alternative" ? alternativeEmailInput.value.trim() : "";

    try {
      resolveCompanionRecipient({ companionEmail, alternativeEmail });
    } catch (err) {
      // Technischer Funktionsname/Details nur ins Log, nie in die UI.
      console.error("Empfängerauflösung fehlgeschlagen:", err);
      showDeliveryError(
        err.code === RECIPIENT_ERROR_CODES.ALTERNATIVE_EMAIL_INVALID
          ? "Bitte gib eine gültige alternative E-Mail-Adresse ein."
          : "Bitte gib eine gültige E-Mail-Adresse für den Wegbegleiter ein."
      );
      return;
    }

    isSending = true;
    deliverySendBtn.disabled = true;
    clearDeliveryStatus();
    showDeliveryStatus("Versand läuft …", "loading");

    try {
      // Die Materialhinweise gehen mit ins ZIP an den Wegbegleiter (siehe
      // Vorgabe Abschnitt 18) — die humbee-Dokumentationsmail bekommt
      // weiterhin ausschließlich die tatsächlich individuell erzeugten
      // Materialien (`lastFiles`, OHNE Anleitung, siehe Abschnitt 19 und
      // `buildRepresentativeDeliveryRequest`s `files`-Parameter unten).
      const filesForZip = lastGuideFile ? [...lastFiles, lastGuideFile] : lastFiles;

      const zip = await buildMaterialZip({
        ifkId: lastManifest.person.ifkId,
        firstName: lastManifest.person.firstName,
        lastName: lastManifest.person.lastName,
        files: filesForZip,
      });

      const request = await buildRepresentativeDeliveryRequest({
        manifest: lastManifest,
        zip,
        files: lastFiles,
        companion,
        alternativeEmail,
        logoUrl: `${window.location.origin}/ifk-logo-full.png`,
      });

      const result = await sendRepresentativeMaterials(request);

      if (result.ok) {
        showDeliveryStatus("Versand erfolgreich.", "success");
      } else if (!result.representative.success && !result.humbee.success) {
        // Beide Teilversände sind unabhängige Requests (siehe
        // sendRepresentativeMaterials.js) — bei einem Fehlschlag beider
        // die jeweils konkrete Fehlermeldung zeigen statt einer
        // generischen, damit z. B. "Anhänge zu groß" von echten
        // Maildienst-Fehlern unterscheidbar bleibt.
        showDeliveryStatus(
          `${result.representative.error || "Versand an Empfänger fehlgeschlagen."} ${result.humbee.error || "Dokumentation an humbee fehlgeschlagen."}`,
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
      const newValue = input.value.trim();
      field.value = newValue;
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

      const statusValue =
        key === "emailForForm"
          ? field.status ?? (field.source ? "recognized" : "needs_review")
          : field.status;
      renderValueCell(valueCell, statusCell, fields, key);
      renderStatusBadge(statusCell, key, statusValue);

      row.appendChild(valueCell);
      row.appendChild(statusCell);

      screenshotPreviewBody.appendChild(row);
    }

    updateApplyButtonState();
    screenshotImportPreview.hidden = false;
  }

  // Liefert das `.gender-option`-Label (Radio + Beschriftung) für einen
  // Geschlechtswert — die Radiogruppe hat keine einzelne feste
  // Zielreferenz wie die übrigen Felder (siehe `fieldTargetElements`).
  function genderOptionLabelFor(value) {
    return document.querySelector(`.gender-option[data-gender-option="${value}"]`);
  }

  // Setzt/entfernt den Zustand "imported" (dezente grüne Hervorhebung,
  // siehe `.field-complete` in style.css) direkt auf dem Eingabeelement
  // — bei `gender` auf der Beschriftung der betroffenen Radio-Option,
  // NIE auf umgebenden Containern/Formulargruppen (siehe Vorgabe).
  function setFieldImportedState(fieldKey, imported, value) {
    if (fieldKey === "gender") {
      // Immer beide Optionen zurücksetzen, dann ggf. gezielt genau die
      // markieren, die zum importierten Wert gehört — verhindert, dass
      // nach einem Wertewechsel beide oder die falsche Option grün bleibt.
      for (const radio of genderRadios) {
        const label = genderOptionLabelFor(radio.value);
        if (label) label.classList.remove("field-complete");
      }
      if (imported) {
        const label = genderOptionLabelFor(value);
        if (label) label.classList.add("field-complete");
      }
      return;
    }

    const target = fieldTargetElements.get(fieldKey);
    if (!target) return;
    target.classList.toggle("field-complete", imported);
  }

  // Markiert ein Feld als automatisch übernommen — NIEMALS für leere
  // Werte (siehe Vorgabe: leere Felder bleiben neutral). Die
  // Hervorhebung verschwindet automatisch, sobald der Nutzer das Feld
  // danach manuell ändert (einmaliger Listener je Aufruf).
  function markFieldAsImported(fieldKey, value) {
    if (typeof value === "string" && value.trim() === "") return;

    setFieldImportedState(fieldKey, true, value);

    const sourceElements = fieldImportSourceElements[fieldKey] || [];
    for (const el of sourceElements) {
      const eventName = el.type === "radio" ? "change" : "input";
      el.addEventListener(eventName, () => setFieldImportedState(fieldKey, false), { once: true });
    }
  }

  // Ein Feld gilt als "automatisch übernommen" (grün), wenn es entweder
  // mit hoher Konfidenz erkannt wurde ODER über die Korrektur-Tabelle
  // geprüft/korrigiert wurde — auch das Berichtigen eines einzelnen
  // unsicheren Zeichens gehört zum Screenshot-Import-Workflow und macht
  // ein Feld nicht zu "manuell erfasst". Erst eine nachträgliche direkte
  // Bearbeitung des bereits befüllten Formularfelds (siehe
  // `setFieldImportedState` oben) entfernt die Markierung wieder.
  // Reine Entscheidungslogik ("automatisch erkannt?") liegt testbar in
  // `core/screenshot/isFieldAutoRecognized.js` — hier wird nur der
  // DOM-/Zustands-spezifische Status abgeleitet und an die reine
  // Funktion übergeben. `emailForForm` führt seinen übernommenen
  // Feldstatus jetzt selbst (`pickEmailForForm.js`); eine nur
  // prüfbedürftig übernommene Adresse gilt dadurch NICHT als sicher
  // erkannt (wird nicht grün markiert).
  function isAutoRecognized(key, field) {
    const status =
      key === "emailForForm"
        ? field.status ?? (field.source ? "recognized" : "needs_review")
        : field.status;
    return isFieldAutoRecognized({
      status,
      wasManuallyReviewed: manuallyReviewedFieldKeys.has(key),
    });
  }

  // ---------------------------------------------------------------------
  // Zweite, fachlich andere Bedeutung derselben grünen Hervorhebung
  // (`.field-complete`): "Erledigungsstatus" statt "Herkunft".
  //
  // `markFieldAsImported`/`isAutoRecognized` oben beantworten "stammt
  // dieser Wert unverändert aus dem Screenshot?" — das ist für IFK-ID
  // und Foto-Link nicht die richtige Frage. Dort soll die Markierung
  // stattdessen bedeuten "dieses Feld ist vollständig und gültig,
  // hier fehlt nichts mehr", UNABHÄNGIG davon, ob der Wert importiert,
  // über "Neu generieren" erzeugt oder manuell eingetippt wurde. Beide
  // Funktionen unten sind bewusst rein ableitend (kein eigener
  // Zustand, keine Sets) — sie lesen den aktuellen Feldinhalt bzw.
  // `lastPhoto`/`lastPhotoUrl` und setzen `.field-complete` exakt
  // danach, an genau einer Stelle je Feld statt verteilt über einzelne
  // Wertzuweisungen.
  // ---------------------------------------------------------------------

  // IFK-ID: grün bei jedem aktuell gültigen, nicht-leeren Wert (siehe
  // `core/id/isIfkIdComplete.js`) — leere und ungültige Werte bleiben
  // neutral. Bei jeder Änderung des Feldinhalts neu bewertet (Eingabe,
  // Screenshot-Übernahme, "Neu generieren").
  function updateIfkIdCompletionState() {
    ifkIdInput.classList.toggle("field-complete", isIfkIdComplete(ifkIdInput.value));
  }

  // Foto-Link: grün nur, wenn der *aktuell im Feld stehende* Link
  // erfolgreich geprüft wurde (`lastPhoto`/`lastPhotoUrl`, siehe
  // `checkRepresentativePhoto`/`handleOpenPhotoCropEditor`/
  // `handleGenerate`) — ein leeres, formal ungültiges, noch nicht
  // geprüftes oder geändertes (und damit neu zu prüfendes) Feld bleibt
  // neutral. Kein Fotoausschnitt-Erfordernis: der automatische
  // Center-Crop reicht, ein manueller Ausschnitt ist keine
  // Voraussetzung.
  function updatePhotoLinkCompletionState() {
    const isValidated = isPhotoLinkValidated({
      lastPhoto,
      lastPhotoUrl,
      currentValue: photoUrlInput.value.trim(),
    });
    photoUrlInput.classList.toggle("field-complete", isValidated);
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
      if (isAutoRecognized("firstName", fields.firstName)) markFieldAsImported("firstName", fields.firstName.value);
    }

    if (isApplyable("lastName", fields.lastName)) {
      lastNameInput.value = fields.lastName.value;
      if (isAutoRecognized("lastName", fields.lastName)) markFieldAsImported("lastName", fields.lastName.value);
    }

    if (isApplyable("gender", fields.gender)) {
      for (const radio of genderRadios) {
        radio.checked = radio.value === fields.gender.value;
      }
      if (isAutoRecognized("gender", fields.gender)) markFieldAsImported("gender", fields.gender.value);
    }

    if (isApplyable("phone", fields.phone)) {
      phoneInput.value = fields.phone.value;
      if (isAutoRecognized("phone", fields.phone)) markFieldAsImported("phone", fields.phone.value);
    }

    // Bundesland/Region werden aus dem Screenshot nur übernommen, wenn
    // die aktuell gewählte Rolle sie überhaupt benötigt — für alle
    // anderen Wegbegleiter bleiben die (ohnehin ausgeblendeten) Felder
    // unangetastet und tauchen weder als Pflicht noch im Material auf
    // (Vorgabe Abschnitt 15). Die OCR erkennt beide Felder weiterhin;
    // allein die Rolle entscheidet über die Übernahme.
    if (roleRequiresRegion(selectedRoleKey())) {
      if (isApplyable("federalState", fields.federalState)) {
        federalStateInput.value = fields.federalState.value;
        if (isAutoRecognized("federalState", fields.federalState))
          markFieldAsImported("federalState", fields.federalState.value);
      }

      if (isApplyable("region", fields.region)) {
        regionInput.value = fields.region.value;
        if (isAutoRecognized("region", fields.region)) markFieldAsImported("region", fields.region.value);
      }
    }

    if (fields.emailForForm.value) {
      emailInput.value = fields.emailForForm.value;
      if (isAutoRecognized("emailForForm", fields.emailForForm)) markFieldAsImported("email", fields.emailForForm.value);
    }

    // Eine bereits manuell eingetragene IFK-ID wird vor dem Import nie
    // stillschweigend überschrieben; eine neue IFK-ID wird hier nie
    // automatisch erzeugt (dafür bleibt bewusst nur der bestehende
    // "Neu generieren"-Button zuständig).
    if (!ifkIdInput.value.trim() && isApplyable("ifkId", fields.ifkId)) {
      ifkIdInput.value = fields.ifkId.value;
      updateIfkIdGenerateBtnEmphasis();
      updateIfkIdCompletionState();
    }

    if (isApplyable("paypalUrl", fields.paypalUrl)) {
      paypalInput.value = fields.paypalUrl.value;
      if (isAutoRecognized("paypalUrl", fields.paypalUrl)) markFieldAsImported("paypalUrl", fields.paypalUrl.value);
    }

    showScreenshotStatus("Erkannte Daten wurden ins Formular übernommen.", "success");
  }

  async function handleGenerate() {
    if (isGenerating) return;

    clearError();
    clearPhotoStatus();
    clearPhotoFieldError();
    deliverySection.hidden = true;
    lastManifest = null;
    lastFiles = null;
    lastGuideFile = null;
    lastPhoto = null;
    lastPhotoUrl = null;
    updatePhotoLinkCompletionState();

    const role = selectedRoleKey();
    if (!role) {
      showError("Bitte zuerst einen Wegbegleiter-Typ auswählen.");
      return;
    }
    // Das Auswahlfeld bietet nur gültige Rollen an; diese Prüfung fängt
    // dennoch jeden unbekannten Wert klar ab (Vorgabe Abschnitt 20:
    // "unbekannte Rolle erzeugt klare Fehlermeldung"), statt später beim
    // Auflösen der Vorlage in einen unbehandelten Fehler zu laufen.
    if (!ROLE_KEY_LIST.includes(role)) {
      showError(`Unbekannter Wegbegleiter-Typ "${role}". Bitte eine der angebotenen Rollen auswählen.`);
      return;
    }

    const materialKeys = selectedMaterialKeys();
    if (materialKeys.length === 0) {
      showError("Bitte mindestens ein Material auswählen.");
      return;
    }

    // ---------- Rohwerte aus dem Formular (noch ungeprüft) ----------
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const ifkIdRaw = ifkIdInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    // Bundesland/Region sind ausschließlich Bestandteil der
    // Datenerfassung, wenn die aktuell gewählte Rolle sie benötigt
    // (siehe `core/materials/roleConfig.js`) — für alle anderen Rollen
    // bleiben beide Felder leer und damit für keine Materialanforderung
    // "vorhanden".
    const requiresRegion = roleRequiresRegion(role);
    const federalState = requiresRegion ? federalStateInput.value.trim() : "";
    const region = requiresRegion ? regionInput.value.trim() : "";
    const photoUrl = photoUrlInput.value.trim();
    const paypalRaw = paypalInput.value.trim();

    const fieldValues = {
      firstName,
      lastName,
      gender: genderInput ? genderInput.value : "",
      ifkId: ifkIdRaw,
      email,
      phone,
      federalState,
      region,
      photoUrl,
      paypalUrl: paypalRaw,
    };

    // ---------- Materialabhängige Pflichtfeldprüfung (siehe
    // `core/materials/materialRequirements.js`, zentrale, DOM-freie
    // Konfiguration statt verteilter if/else-Blöcke) ----------
    // Ein Material gilt als "bereit", wenn alle für DIESES Material
    // benötigten Felder oberflächlich ausgefüllt sind. Nur wenn KEIN
    // ausgewähltes Material bereit ist, blockiert ein zusammengefasster,
    // konkreter Hinweis die gesamte Erzeugung (Vorgabe Abschnitt 10/11)
    // — andernfalls wird jedes bereite Material unabhängig erzeugt und
    // für nicht bereite Materialien erscheint anschließend nur ein
    // nicht-blockierender Hinweis (siehe unten).
    const anyMaterialReady = materialKeys.some(
      (key) => getMissingFields(getRequiredFieldsForMaterial(key, role), fieldValues).length === 0
    );
    if (!anyMaterialReady) {
      const missingUnion = getMissingFields(getRequiredFieldsForMaterials(materialKeys, role), fieldValues);
      showError(buildMissingFieldsMessage(materialKeys, missingUnion));
      return;
    }

    const requestedFlyer = materialKeys.some((key) => FLYER_KEYS.has(key));
    const requestedPaypal = materialKeys.some((key) => PAYPAL_KEYS.has(key));
    const requestedGiro = materialKeys.some((key) => GIRO_KEYS.has(key));
    // Höchstens eine Urkunde ist auswählbar (eine Checkbox, deren
    // `data-material-key` sich nach der Rolle richtet) — der konkrete
    // Schlüssel steuert Pflichtfelder, Manifest, Dateiname und
    // Vorlagenauswahl generisch.
    const certificateKey = materialKeys.find((key) => CERTIFICATE_KEYS.has(key));
    const requestedCertificate = certificateKey !== undefined;

    // GiroCode-/PayPal-Daten werden benötigt, sobald das jeweilige
    // Material direkt ausgewählt ist ODER der Flyer sie zum Einbetten
    // braucht (Vorgabe Abschnitt 6) — unabhängig davon bleibt eine
    // fehlende/ungültige IFK-ID bzw. ein fehlender PayPal-Link für alle
    // anderen (nicht darauf angewiesenen) Materialien folgenlos
    // (Abschnitt 3/4/5/14).
    const needsGiroData = requestedGiro || requestedFlyer;
    const needsPaypalData = requestedPaypal || requestedFlyer;

    const skipMessages = [];

    let ifkId;
    let girocodeDataReady = false;
    if (needsGiroData) {
      const ifkIdCheck = validateIfkId(ifkIdRaw);
      if (ifkIdCheck.valid) {
        ifkId = ifkIdCheck.normalized;
        ifkIdInput.value = ifkId;
        girocodeDataReady = true;
      } else if (requestedGiro) {
        skipMessages.push("GiroCode schwarz konnte nicht erzeugt werden: gültige IFK-ID fehlt.");
      }
    }

    let paypalUrl;
    let paypalDataReady = false;
    if (needsPaypalData) {
      const extracted = paypalRaw ? extractPaypalLink(paypalRaw) : null;
      if (extracted) {
        paypalUrl = extracted;
        paypalDataReady = true;
      } else if (requestedPaypal) {
        skipMessages.push("PayPal QR schwarz konnte nicht erzeugt werden: gültiger PayPal-Link fehlt.");
      }
    }

    let certificateReady = false;
    if (requestedCertificate) {
      const certLabel = MATERIAL_TYPES_BY_KEY[certificateKey]?.label || "Urkunde";
      const certMissing = getMissingFields(
        getRequiredFieldsForMaterial(certificateKey, role),
        fieldValues
      );
      if (certMissing.length > 0) {
        skipMessages.push(
          `${certLabel} konnte nicht erzeugt werden: ${describeFieldList(certMissing)} fehlt.`
        );
      } else if (!isCertificateTemplateAvailableForRole(role, certificateKey)) {
        // Verteidigungslinie gegen einen stillen Fallback auf eine
        // fremde Urkundenvorlage — greift z. B. bei einem Altzustand aus
        // der Zeit vor einem Rollenwechsel.
        skipMessages.push(
          `${certLabel} konnte nicht erzeugt werden: für den gewählten Wegbegleiter-Typ ist keine passende Urkunden-Vorlage hinterlegt (${getRoleConfig(role).label}).`
        );
      } else {
        certificateReady = true;
      }
    }

    let photoAsset = null;
    let flyerDataReady = false;
    if (requestedFlyer && FLYERS_TEMPORARILY_DISABLED) {
      // Verteidigungslinie zur globalen Flyer-Sperre: die Checkbox ist
      // bereits `disabled`, ein trotzdem im Manifest gelandeter Flyer
      // (Altzustand) wird hier klar abgewiesen — kein Foto-Fetch, kein
      // Rendern.
      skipMessages.push(`Flyer konnte nicht erzeugt werden: ${FLYER_DISABLED_HINT}`);
    } else if (requestedFlyer) {
      // Foto ist ausschließlich Pflicht, wenn ein fotobasiertes Material
      // (Flyer) ausgewählt ist (Vorgabe Abschnitt 13) — kein unnötiger
      // Foto-Fetch, solange die übrigen Flyer-Anforderungen nicht
      // ebenfalls erfüllt sind.
      const flyerMissing = getMissingFields(getRequiredFieldsForMaterial(MATERIAL_TYPE_KEYS.FLYER_HOME, role), fieldValues);
      const reasons = flyerMissing.map((key) => FIELD_LABELS[key]);
      if (!flyerMissing.includes(FIELD_KEYS.EMAIL) && email && !isValidEmail(email)) {
        reasons.push("gültige E-Mail-Adresse");
      }
      if (!flyerMissing.includes(FIELD_KEYS.PHOTO_URL) && photoUrl && !isHttpUrl(photoUrl)) {
        reasons.push("gültiger Foto-Link");
      }
      if (!flyerMissing.includes(FIELD_KEYS.IFK_ID) && !girocodeDataReady) {
        reasons.push("gültige IFK-ID");
      }
      if (!flyerMissing.includes(FIELD_KEYS.PAYPAL_URL) && !paypalDataReady) {
        reasons.push("gültiger PayPal-Link");
      }

      if (reasons.length > 0) {
        skipMessages.push(`Flyer konnte nicht erzeugt werden: ${reasons.join(", ")} fehlt/fehlen.`);
      } else if (!isFlyerTemplateAvailableForRole(role, MATERIAL_TYPE_KEYS.FLYER_HOME)) {
        skipMessages.push(
          `Flyer konnte nicht erzeugt werden: für den gewählten Wegbegleiter-Typ ist noch keine Flyer-Vorlage hinterlegt (${getRoleConfig(role).label}).`
        );
      } else {
        showPhotoStatus("Foto wird geprüft …", "loading");
        const photoResult = await fetchRepresentativePhoto(photoUrl);
        if (!photoResult.ok) {
          lastPhoto = null;
          lastPhotoUrl = null;
          updatePhotoLinkCompletionState();
          showPhotoStatus(getPhotoRetrievalErrorMessage(photoResult.reason), "error");
          showPhotoFieldError("Für den Flyer wird ein gültiges, erreichbares Foto benötigt.");
          skipMessages.push(`Flyer konnte nicht erzeugt werden: ${getPhotoRetrievalErrorMessage(photoResult.reason)}`);
        } else {
          lastPhoto = photoResult;
          lastPhotoUrl = photoUrl;
          updatePhotoLinkCompletionState();
          const sizeKb = Math.max(1, Math.round(photoResult.size / 1024));
          showPhotoStatus(`Foto erfolgreich geladen (${photoResult.format}, ${sizeKb} KB).`, "success");
          showPhotoPreview(`data:${photoResult.contentType};base64,${photoResult.content}`);
          try {
            photoAsset = await normalizePhotoToPng({
              dataUrl: `data:${photoResult.contentType};base64,${photoResult.content}`,
            });
            // Manueller Ausschnitt (siehe Fotoausschnitt-Editor) nur
            // verwenden, wenn er tatsächlich zu diesem Foto-Link gehört —
            // sonst bleibt es beim automatischen Center-Crop (siehe
            // `renderFlyer.js`/`placeImage.js`). Home- und Druckerei-
            // Flyer erhalten weiter unten dasselbe `photoAsset`-Objekt
            // und damit garantiert denselben Ausschnitt.
            if (photoCrop && photoCropSourceUrl === photoUrl) {
              photoAsset.crop = photoCrop;
            }
            flyerDataReady = true;
          } catch {
            showPhotoFieldError("Foto konnte nicht für den Flyer aufbereitet werden. Bitte ein anderes Foto verwenden.");
            skipMessages.push("Flyer konnte nicht erzeugt werden: Foto konnte nicht aufbereitet werden.");
          }
        }
      }
    }

    // Nur tatsächlich erzeugbare Materialien fließen ins Manifest ein —
    // ein nicht bereites, aber ausgewähltes Material (z. B. GiroCode
    // ohne gültige IFK-ID) darf die Erzeugung der übrigen Materialien
    // nicht blockieren (Vorgabe Abschnitt 11).
    const materialKeysToGenerate = materialKeys.filter((key) => {
      if (FLYER_KEYS.has(key)) return flyerDataReady;
      if (PAYPAL_KEYS.has(key)) return paypalDataReady;
      if (GIRO_KEYS.has(key)) return girocodeDataReady;
      if (CERTIFICATE_KEYS.has(key)) return certificateReady;
      return false;
    });

    if (materialKeysToGenerate.length === 0) {
      // Kein einziges ausgewähltes Material konnte erzeugt werden —
      // nichts zum Anzeigen, daher blockierender, aber konkreter Hinweis
      // je Material (Vorgabe Abschnitt 11, zweite Alternative).
      showError(skipMessages.join("\n"));
      return;
    }

    const manifest = buildMaterialManifest({
      firstName,
      lastName,
      ifkId,
      role,
      gender: genderInput ? genderInput.value : undefined,
      // E-Mail/Telefon/Foto/Bundesland/Region sind ausschließlich für
      // den Flyer relevant (Vorgabe Abschnitt 6) — bei jeder anderen
      // Materialauswahl bewusst NICHT ans Manifest übergeben, damit ein
      // ungültiger, für die aktuelle Auswahl irrelevanter Wert in einem
      // dieser Felder nicht versehentlich blockiert (Abschnitt 13/14).
      email: requestedFlyer && flyerDataReady ? email : undefined,
      phone: requestedFlyer && flyerDataReady ? phone : undefined,
      photoUrl: requestedFlyer && flyerDataReady ? photoUrl : undefined,
      federalState: requestedFlyer && flyerDataReady && requiresRegion ? federalState : undefined,
      region: requestedFlyer && flyerDataReady && requiresRegion ? region : undefined,
      materials: materialKeysToGenerate,
    });

    isGenerating = true;
    generateBtn.disabled = true;

    try {
      // QR-Materialien: alles vom Nutzer ausgewählte und tatsächlich
      // bereite, plus (nur intern, nicht Teil der Ergebnisliste/des Zips)
      // die schwarzen PayPal-/GiroCode-Varianten, falls der Flyer erzeugt
      // wird und der Nutzer diese nicht ohnehin schon separat ausgewählt
      // hat — der Flyer benötigt exakt diese beiden Grafiken zum
      // Einbetten (siehe `templates/*/template.config.js`, Felder
      // `qrPaypal`/`qrGiro`). Es werden ausschließlich die schwarzen
      // Varianten (mit grünem Logo) verwendet — die grünen QR-Varianten
      // wurden aus dem produktiven Workflow entfernt (siehe
      // `materialTypes.js`).
      const selectedQrKeys = materialKeysToGenerate.filter((key) => PAYPAL_KEYS.has(key) || GIRO_KEYS.has(key));
      const extraFlyerQrKeys = flyerDataReady
        ? [MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK, MATERIAL_TYPE_KEYS.QR_GIRO_BLACK].filter(
            (key) => !selectedQrKeys.includes(key)
          )
        : [];
      const allQrKeys = [...selectedQrKeys, ...extraFlyerQrKeys];

      let qrResults = [];
      if (allQrKeys.length > 0) {
        const qrManifest = buildMaterialManifest({
          firstName,
          lastName,
          ifkId,
          materials: allQrKeys,
        });
        qrResults = await generateQrMaterials({
          manifest: qrManifest,
          paypalUrl,
          girocode: allQrKeys.includes(MATERIAL_TYPE_KEYS.QR_GIRO_BLACK) ? {} : undefined,
          logo: logoUrl,
        });
      }

      const files = qrResults.filter((result) => selectedQrKeys.includes(result.key));

      if (flyerDataReady) {
        const flyerEntries = manifest.materials.filter((entry) => FLYER_KEYS.has(entry.key));

        const qrPaypalResult = qrResults.find((result) => result.key === MATERIAL_TYPE_KEYS.QR_PAYPAL_BLACK);
        const qrGiroResult = qrResults.find((result) => result.key === MATERIAL_TYPE_KEYS.QR_GIRO_BLACK);
        const qrPaypalAsset = {
          bytes: new Uint8Array(await qrPaypalResult.content.arrayBuffer()),
          mimeType: "image/png",
        };
        const qrGiroAsset = {
          bytes: new Uint8Array(await qrGiroResult.content.arrayBuffer()),
          mimeType: "image/png",
        };

        // Ansprache (Du/Sie) ist KEINE Nutzerauswahl: für jede gewählte
        // Flyer-Materialart werden automatisch ALLE für diese Rolle
        // konfigurierten Ansprache-Varianten erzeugt (aktuell ["du","sie"]
        // beim Repräsentanten) — siehe `buildFlyerVariantEntries` (DOM-frei,
        // unabhängig testbar; kennt nur "welche Ansprachen", nicht die
        // Vorlagen). Druckerei und Home brauchen JEWEILS eigene Vorder-/
        // Rückseiten-Vorlagen (Beschnitt vs. Trimformat-Imposition, siehe
        // `resolveFlyerFrontTemplateForJob`/`resolveFlyerBackTemplateForJob`)
        // und unterschiedliche Renderer:
        // - FLYER_DRUCKEREI → `generateFlyerMaterial` (zweiseitiges
        //   150×212mm-PDF mit Beschnitt, wie bisher).
        // - FLYER_HOME → `generateFlyerHomeSheet` (DIN-A4-quer-Bogen mit
        //   Front/Back je zweimal imponiert, siehe dort für Geometrie/
        //   Duplex-Begründung).
        const flyerVariantJobs = buildFlyerVariantEntries({ entries: flyerEntries, roleKey: role });

        for (const job of flyerVariantJobs) {
          const gender = manifest.person.gender;
          const frontTemplateConfig = resolveFlyerFrontTemplateForJob(job.entry.key, gender, job.salutation);
          const backTemplateConfig = resolveFlyerBackTemplateForJob(job.entry.key);
          const generateFn = job.entry.key === MATERIAL_TYPE_KEYS.FLYER_HOME ? generateFlyerHomeSheet : generateFlyerMaterial;
          const flyerFile = await generateFn({
            entry: job.entry,
            // `generateFlyerMaterial` erwartet `templateConfig`,
            // `generateFlyerHomeSheet` `frontTemplateConfig` — beide
            // Schlüssel mitgeben, jede Funktion liest nur ihren eigenen.
            frontTemplateConfig,
            templateConfig: frontTemplateConfig,
            backTemplateConfig,
            person: manifest.person,
            photoAsset,
            qrPaypalAsset,
            qrGiroAsset,
            deps: { loadTemplateAssets: loadTemplateAssetsBrowser },
          });
          files.push(flyerFile);
        }
      }

      if (certificateReady) {
        const certificateEntry = manifest.materials.find((entry) => CERTIFICATE_KEYS.has(entry.key));
        // Vorlagenauswahl vollständig hier, vor dem Rendern: für die
        // geschlechtsneutralen Gremien-Urkunden ist `genderInput` null
        // (die einzige Vorlage wird geliefert), für Repräsentant/
        // Botschafter entscheidet das Geschlecht — `female` liefert nie
        // die männliche Vorlage, fehlendes Geschlecht bei einer
        // geschlechtsspezifischen Urkunde wirft (wurde durch die
        // Pflichtfeldprüfung oben aber bereits ausgeschlossen).
        const certificateFile = await generateCertificateMaterial({
          entry: certificateEntry,
          templateConfig: resolveCertificateTemplate(certificateEntry.key, genderInput ? genderInput.value : undefined),
          person: manifest.person,
          deps: { loadTemplateAssets: loadTemplateAssetsBrowser },
        });
        files.push(certificateFile);
      }

      // Begleit-Anleitung: genau einmal, sobald mindestens ein Material
      // tatsächlich erzeugt wurde — unabhängig von Materialart/-anzahl
      // (Vorgabe Abschnitt 17). Kein personenbezogener Inhalt, daher
      // ohne `person`/`manifest`-Bezug erzeugt.
      lastGuideFile =
        files.length > 0
          ? await generateCompanionMaterialGuide({ deps: { loadFontBytes: loadFontFileBrowser } })
          : null;

      renderResults(manifest.person, files, lastGuideFile);

      if (skipMessages.length > 0) {
        // Nicht blockierend: die übrigen ausgewählten Materialien wurden
        // trotzdem erzeugt und bleiben sichtbar (Vorgabe Abschnitt 11) —
        // daher kein `showError()` (das würde `results` wieder
        // verstecken), sondern derselbe Hinweisbereich ohne die
        // Ergebnisse zu verstecken.
        errorMessage.textContent = skipMessages.join("\n");
        errorMessage.hidden = false;
      }

      lastManifest = manifest;
      lastFiles = files;
      resetDeliverySection();
      deliverySection.hidden = false;

      // Bei rein optionalem Foto (kein bereiter Flyer, aber trotzdem ein
      // Link eingetragen) weiterhin informativ prüfen — nicht
      // blockierend, da für die tatsächlich erzeugten Materialien nicht
      // benötigt.
      if (!flyerDataReady && photoUrl) {
        await checkRepresentativePhoto(photoUrl);
      }
    } catch (err) {
      showError(err.message || "Beim Erstellen der Materialien ist ein Fehler aufgetreten.");
    } finally {
      isGenerating = false;
      generateBtn.disabled = false;
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
    // Eine neu generierte IFK-ID ist per Definition gültig — gilt daher
    // ebenso als "erledigt" (grün) wie eine importierte oder manuell
    // eingetippte gültige ID (siehe `updateIfkIdCompletionState`).
    updateIfkIdCompletionState();
  });

  ifkIdInput.addEventListener("input", () => {
    updateIfkIdGenerateBtnEmphasis();
    // Deckt auch manuell eingetippte gültige IDs ab (siehe
    // `updateIfkIdCompletionState`: "erledigt" hängt hier nur von der
    // aktuellen Gültigkeit ab, nicht von der Herkunft des Werts).
    updateIfkIdCompletionState();
  });
  updateIfkIdGenerateBtnEmphasis();
  updateIfkIdCompletionState();

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

  photoUrlInput.addEventListener("input", () => {
    clearPhotoFieldError();
    // Wechsel des Foto-Links (Punkt 9 der Vorgabe): ein zuvor geladenes
    // Foto und ein dafür gespeicherter manueller Ausschnitt gehören zum
    // alten Link und werden verworfen — der nächste Editor-Aufruf oder
    // die nächste Erzeugung lädt das neue Foto frisch.
    if (photoUrlInput.value.trim() !== lastPhotoUrl) {
      lastPhoto = null;
      lastPhotoUrl = null;
    }
    // Geänderter Link muss immer neu geprüft werden, bevor er wieder als
    // "erledigt" gelten darf (siehe `updatePhotoLinkCompletionState`).
    updatePhotoLinkCompletionState();
    if (photoUrlInput.value.trim() !== photoCropSourceUrl) {
      resetPhotoCrop();
    }
  });

  photoCropOpenBtn.addEventListener("click", handleOpenPhotoCropEditor);
  photoCropResetBtn.addEventListener("click", resetPhotoCrop);
  updatePhotoCropStatusUI();

  for (const checkbox of materialCheckboxes) {
    checkbox.addEventListener("change", updateRequiredFieldIndicators);
  }

  roleSelect.addEventListener("change", applyRoleToForm);
  applyRoleToForm();

  generateBtn.addEventListener("click", handleGenerate);
  deliverySendBtn.addEventListener("click", handleSendDelivery);
}
