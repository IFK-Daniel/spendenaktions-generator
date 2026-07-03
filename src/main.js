import QRCode from "qrcode";
import logoUrl from "../Medien/IFK Logo nur Zähne.png";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let generatedState = null;

const GIROCODE_DATA = {
  empfaenger: "Stiftung It s for Kids",
  iban: "DE48300800000228228800",
  bic: "",
  betrag: "",
};

const QR_COLOR_SCHWARZ = "#000000";
const QR_COLOR_GRUEN = "#8CC140";

const PAYPAL_URL_REGEX =
  /https?:\/\/(www\.)?paypal\.com\/[^\s"'<>]+|https?:\/\/(www\.)?paypal\.me\/[^\s"'<>]+/i;

const CAMPAIGN_TITLE_REGEX = /für\s+(.+?)(?:[.!?\n]|$)/i;
const DONATE_LINK_REGEX = /paypal\.com\/donate/i;

function extractPaypalLink(text) {
  const match = text.match(PAYPAL_URL_REGEX);
  if (!match) return null;
  return match[0].replace(/[),.]+$/, "");
}

function extractCampaignTitle(text) {
  const match = text.match(CAMPAIGN_TITLE_REGEX);
  if (!match) return null;
  const title = match[1].trim();
  return title || null;
}

function slugify(text) {
  const umlautMap = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };
  const replaced = text.replace(/[äöüÄÖÜß]/g, (ch) => umlautMap[ch]);
  return replaced
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildGirocodePayload({ empfaenger, iban, bic, betrag, verwendungszweck }) {
  const lines = [
    "BCD",
    "002",
    "1",
    "SCT",
    bic,
    empfaenger,
    iban.replace(/\s+/g, ""),
    betrag ? `EUR${betrag}` : "",
    "",
    "",
    verwendungszweck,
    "",
  ];
  return lines.join("\n");
}

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawLogoOnCanvas(canvas, logoImage) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const logoSize = size * 0.18;
  const logoX = (size - logoSize) / 2;
  const logoY = (size - logoSize) / 2;

  const paddedSize = logoSize * 1.25;
  const paddedX = (size - paddedSize) / 2;
  const paddedY = (size - paddedSize) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(paddedX, paddedY, paddedSize, paddedSize);

  ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
}

async function renderQrToCanvas(canvas, downloadLink, text, filename, logoImage, moduleColor) {
  await QRCode.toCanvas(canvas, text, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: moduleColor, light: "#ffffff" },
  });
  await drawLogoOnCanvas(canvas, logoImage);
  downloadLink.href = canvas.toDataURL("image/png");
  downloadLink.download = filename;
}

async function handleGenerate() {
  clearError();

  const rawText = input.value.trim();
  if (!rawText) {
    showError("Bitte einen PayPal-Link oder Share-Text einfügen.");
    return;
  }

  const paypalLink = extractPaypalLink(rawText);
  if (!paypalLink) {
    showError(
      "Kein gültiger PayPal-Link gefunden. Bitte einen Link wie z. B. https://www.paypal.com/donate/... einfügen."
    );
    return;
  }

  const autoTitle = extractCampaignTitle(rawText);
  const isDonateLink = DONATE_LINK_REGEX.test(paypalLink);
  const needsManualTitle = isDonateLink && !autoTitle;

  if (needsManualTitle) {
    manualTitleField.hidden = false;
    const manualTitle = manualTitleInput.value.trim();
    if (!manualTitle) {
      showError("Bitte einen Kampagnennamen / Verwendungszweck angeben.");
      return;
    }
  } else {
    manualTitleField.hidden = true;
  }

  const campaignTitle = needsManualTitle ? manualTitleInput.value.trim() : autoTitle;
  const slug = slugify(campaignTitle || "") || "kampagne";
  campaignTitleEl.textContent = campaignTitle || "Kampagne";

  const girocodePayload = buildGirocodePayload({
    ...GIROCODE_DATA,
    verwendungszweck: campaignTitle || "SPENDE",
  });

  try {
    const logoImage = await loadImage(logoUrl);
    await renderQrToCanvas(
      paypalCanvasSchwarz,
      paypalDownloadSchwarz,
      paypalLink,
      `${slug}-paypal-schwarz.png`,
      logoImage,
      QR_COLOR_SCHWARZ
    );
    await renderQrToCanvas(
      paypalCanvasGruen,
      paypalDownloadGruen,
      paypalLink,
      `${slug}-paypal-gruen.png`,
      logoImage,
      QR_COLOR_GRUEN
    );
    await renderQrToCanvas(
      girocodeCanvasSchwarz,
      girocodeDownloadSchwarz,
      girocodePayload,
      `${slug}-girocode-schwarz.png`,
      logoImage,
      QR_COLOR_SCHWARZ
    );
    await renderQrToCanvas(
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
        paypalSchwarz: paypalCanvasSchwarz.toDataURL("image/png"),
        paypalGruen: paypalCanvasGruen.toDataURL("image/png"),
        girocodeSchwarz: girocodeCanvasSchwarz.toDataURL("image/png"),
        girocodeGruen: girocodeCanvasGruen.toDataURL("image/png"),
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
    showEmailStatus("Bitte zuerst QR-Codes erstellen.", "error");
    return;
  }

  const email = emailInput.value.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    showEmailStatus("Bitte eine gültige E-Mail-Adresse eingeben.", "error");
    return;
  }

  const { campaignTitle, paypalLink, pngs, filenames } = generatedState;

  emailSendBtn.disabled = true;
  showEmailStatus("QR-Codes werden gesendet …", "success");

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      showEmailStatus("QR-Codes wurden per E-Mail versendet.", "success");
    } else {
      showEmailStatus(result.error || "Versand fehlgeschlagen.", "error");
    }
  } catch (err) {
    showEmailStatus("Versand fehlgeschlagen. Bitte später erneut versuchen.", "error");
  } finally {
    emailSendBtn.disabled = false;
  }
}

generateBtn.addEventListener("click", handleGenerate);
emailSendBtn.addEventListener("click", handleSendEmail);
