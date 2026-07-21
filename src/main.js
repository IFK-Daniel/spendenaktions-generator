import logoUrl from "../Medien/IFK Logo nur Zähne.png";
import { generateQr } from "../core/qr/generateQr.js";
import { loadImage } from "../core/branding/loadImage.js";
import { buildGirocodePayload } from "../core/girocode/buildGirocodePayload.js";
import { QR_COLOR_SCHWARZ, QR_COLOR_GRUEN } from "../core/config/colors.js";
import { GIROCODE_DEFAULTS } from "../core/config/girocodeDefaults.js";
import { extractPaypalLink } from "../core/text/extractPaypalLink.js";
import { extractCampaignTitle } from "../core/text/extractCampaignTitle.js";
import { isDonateLink } from "../core/text/isDonateLink.js";
import { slugify } from "../core/text/slugify.js";
import { isValidEmail } from "../core/mail/validateEmail.js";
import { sendGeneratedMaterials } from "../core/mail/sendGeneratedMaterials.js";

const input = document.getElementById("paypal-input");
const generateBtn = document.getElementById("generate-btn");
const errorMessage = document.getElementById("error-message");
const results = document.getElementById("results");
const campaignTitleEl = document.getElementById("campaign-title");
const manualTitleField = document.getElementById("manual-title-field");
const manualTitleInput = document.getElementById("manual-title-input");

const paypalCanvasSchwarz = document.getElementById("paypal-qr-schwarz");
const paypalDownloadSchwarz = document.getElementById("paypal-download-schwarz");
const paypalCanvasGruen = document.getElementById("paypal-qr-gruen");
const paypalDownloadGruen = document.getElementById("paypal-download-gruen");

const girocodeCanvasSchwarz = document.getElementById("girocode-qr-schwarz");
const girocodeDownloadSchwarz = document.getElementById("girocode-download-schwarz");
const girocodeCanvasGruen = document.getElementById("girocode-qr-gruen");
const girocodeDownloadGruen = document.getElementById("girocode-download-gruen");

const emailInput = document.getElementById("email-input");
const infoCheckbox = document.getElementById("info-checkbox");
const emailSendBtn = document.getElementById("email-send-btn");
const emailStatus = document.getElementById("email-status");

let generatedState = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  results.hidden = true;
}

function clearError() {
  errorMessage.hidden = true;
  errorMessage.textContent = "";
}

function showEmailStatus(message, type) {
  emailStatus.textContent = message;
  emailStatus.className = `email-status ${type}`;
  emailStatus.hidden = false;
}

function clearEmailStatus() {
  emailStatus.hidden = true;
  emailStatus.textContent = "";
  emailStatus.className = "email-status";
}

async function renderQrToCanvas(canvas, downloadLink, text, filename, logoImage, moduleColor) {
  const dataUrl = await generateQr(canvas, text, logoImage, moduleColor);
  downloadLink.href = dataUrl;
  downloadLink.download = filename;
  return dataUrl;
}

async function handleGenerate() {
  clearError();

  const rawText = input.value.trim();
  if (!rawText) {
    showError("Bitte füge einen PayPal-Link oder Share-Text ein.");
    return;
  }

  const paypalLink = extractPaypalLink(rawText);
  if (!paypalLink) {
    showError(
      "Kein gültiger PayPal-Link gefunden. Bitte füge einen Link wie z. B. https://www.paypal.com/donate/... ein."
    );
    return;
  }

  const autoTitle = extractCampaignTitle(rawText);
  const needsManualTitle = isDonateLink(paypalLink) && !autoTitle;

  if (needsManualTitle) {
    manualTitleField.hidden = false;
    const manualTitle = manualTitleInput.value.trim();
    if (!manualTitle) {
      showError("Bitte gib einen Kampagnennamen / Verwendungszweck an.");
      return;
    }
  } else {
    manualTitleField.hidden = true;
  }

  const campaignTitle = needsManualTitle ? manualTitleInput.value.trim() : autoTitle;
  const slug = slugify(campaignTitle || "") || "kampagne";
  campaignTitleEl.textContent = campaignTitle || "Kampagne";

  const girocodePayload = buildGirocodePayload({
    ...GIROCODE_DEFAULTS,
    verwendungszweck: campaignTitle || "SPENDE",
  });

  try {
    const logoImage = await loadImage(logoUrl);

    const paypalSchwarz = await renderQrToCanvas(
      paypalCanvasSchwarz,
      paypalDownloadSchwarz,
      paypalLink,
      `${slug}-paypal-schwarz.png`,
      logoImage,
      QR_COLOR_SCHWARZ
    );
    const paypalGruen = await renderQrToCanvas(
      paypalCanvasGruen,
      paypalDownloadGruen,
      paypalLink,
      `${slug}-paypal-gruen.png`,
      logoImage,
      QR_COLOR_GRUEN
    );
    const girocodeSchwarz = await renderQrToCanvas(
      girocodeCanvasSchwarz,
      girocodeDownloadSchwarz,
      girocodePayload,
      `${slug}-girocode-schwarz.png`,
      logoImage,
      QR_COLOR_SCHWARZ
    );
    const girocodeGruen = await renderQrToCanvas(
      girocodeCanvasGruen,
      girocodeDownloadGruen,
      girocodePayload,
      `${slug}-girocode-gruen.png`,
      logoImage,
      QR_COLOR_GRUEN
    );

    generatedState = {
      campaignTitle: campaignTitle || "Kampagne",
      paypalLink,
      pngs: {
        paypalSchwarz,
        paypalGruen,
        girocodeSchwarz,
        girocodeGruen,
      },
      filenames: {
        paypalSchwarz: `${slug}-paypal-schwarz.png`,
        paypalGruen: `${slug}-paypal-gruen.png`,
        girocodeSchwarz: `${slug}-girocode-schwarz.png`,
        girocodeGruen: `${slug}-girocode-gruen.png`,
      },
    };
    clearEmailStatus();

    results.hidden = false;
  } catch (err) {
    generatedState = null;
    showError("Beim Erstellen der QR-Codes ist ein Fehler aufgetreten.");
  }
}

async function handleSendEmail() {
  clearEmailStatus();

  if (!generatedState) {
    showEmailStatus("Bitte erstelle zuerst QR-Codes.", "error");
    return;
  }

  const email = emailInput.value.trim();
  if (!isValidEmail(email)) {
    showEmailStatus("Bitte gib eine gültige E-Mail-Adresse ein.", "error");
    return;
  }

  const { campaignTitle, paypalLink, pngs, filenames } = generatedState;

  emailSendBtn.disabled = true;
  showEmailStatus("QR-Codes werden gesendet …", "success");

  try {
    const result = await sendGeneratedMaterials({
      email,
      campaignTitle,
      paypalLink,
      infoOptIn: infoCheckbox.checked,
      attachments: [
        { filename: filenames.paypalSchwarz, content: pngs.paypalSchwarz },
        { filename: filenames.paypalGruen, content: pngs.paypalGruen },
        { filename: filenames.girocodeSchwarz, content: pngs.girocodeSchwarz },
        { filename: filenames.girocodeGruen, content: pngs.girocodeGruen },
      ],
    });

    if (result.ok) {
      showEmailStatus("QR-Codes wurden per E-Mail versendet.", "success");
    } else {
      showEmailStatus(result.error || "Versand fehlgeschlagen.", "error");
    }
  } catch (err) {
    showEmailStatus("Versand fehlgeschlagen. Bitte versuche es später erneut.", "error");
  } finally {
    emailSendBtn.disabled = false;
  }
}

generateBtn.addEventListener("click", handleGenerate);
emailSendBtn.addEventListener("click", handleSendEmail);

const girocodeInfoBtn = document.getElementById("girocode-info-btn");
const girocodeInfoPopover = document.getElementById("girocode-info");

if (girocodeInfoBtn && girocodeInfoPopover) {
  girocodeInfoBtn.addEventListener("click", () => {
    const isHidden = girocodeInfoPopover.hidden;
    girocodeInfoPopover.hidden = !isHidden;
    girocodeInfoBtn.setAttribute("aria-expanded", String(isHidden));
  });
}
