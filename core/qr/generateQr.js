import QRCode from "qrcode";
import { drawLogoOnCanvas } from "../branding/drawLogoOnCanvas.js";

export async function generateQr(canvas, text, logoImage, moduleColor) {
  await QRCode.toCanvas(canvas, text, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: moduleColor, light: "#ffffff" },
  });
  await drawLogoOnCanvas(canvas, logoImage);
  return canvas.toDataURL("image/png");
}
