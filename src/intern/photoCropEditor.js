import { loadImage } from "../../core/branding/loadImage.js";
import {
  clampPhotoCrop,
  computePhotoCropLayout,
  DEFAULT_PHOTO_CROP,
  PHOTO_CROP_MAX_ZOOM,
  PHOTO_CROP_MIN_ZOOM,
} from "../../core/pdf/photoCrop.js";

// Feste, quadratische Arbeitsfläche in Canvas-Pixeln (bewusst unabhängig
// von der tatsächlichen CSS-Anzeigegröße — die Canvas skaliert per CSS
// responsiv, die Crop-Werte bleiben dank Normalisierung unabhängig
// davon identisch, siehe photoCrop.js).
const STAGE_SIZE = 320;
const NUDGE_STEP = 0.08;
const WHEEL_ZOOM_STEP = 0.08;

/**
 * Verdrahtet den Fotoausschnitt-Editor (Modal mit Canvas-Vorschau,
 * Zoom-Regler, Drag/Touch, Richtungsbuttons). Nutzt für die gesamte
 * Ausschnitt-Mathematik `core/pdf/photoCrop.js` — dieselbe Funktion, die
 * auch `core/pdf/placeImage.js` beim PDF-Rendern verwendet, damit
 * Vorschau und PDF garantiert denselben Ausschnitt zeigen (siehe
 * `toCanvasCrop`/`toStoredCrop` unten für die einzige nötige Anpassung:
 * die Y-Achse ist in PDF-Koordinaten nach oben, auf dem Canvas nach
 * unten orientiert).
 *
 * @returns {{ open: (params: { imageSrc: string, initialCrop?: object }) => Promise<{applied: boolean, crop: object}> }}
 */
export function initPhotoCropEditor() {
  const backdrop = document.getElementById("photo-crop-modal-backdrop");
  const modal = document.getElementById("photo-crop-modal");
  const closeBtn = document.getElementById("photo-crop-close-btn");
  const canvas = document.getElementById("photo-crop-canvas");
  const ctx = canvas.getContext("2d");
  const zoomSlider = document.getElementById("photo-crop-zoom-slider");
  const zoomOutBtn = document.getElementById("photo-crop-zoom-out");
  const zoomInBtn = document.getElementById("photo-crop-zoom-in");
  const nudgeUpBtn = document.getElementById("photo-crop-nudge-up");
  const nudgeDownBtn = document.getElementById("photo-crop-nudge-down");
  const nudgeLeftBtn = document.getElementById("photo-crop-nudge-left");
  const nudgeRightBtn = document.getElementById("photo-crop-nudge-right");
  const resetBtn = document.getElementById("photo-crop-reset-modal-btn");
  const cancelBtn = document.getElementById("photo-crop-cancel-btn");
  const applyBtn = document.getElementById("photo-crop-apply-btn");
  const errorEl = document.getElementById("photo-crop-error");

  canvas.width = STAGE_SIZE;
  canvas.height = STAGE_SIZE;

  let image = null;
  // Arbeits-Crop in Canvas-Koordinaten (Y nach unten) — siehe
  // Modul-Kommentar. Wird beim Öffnen aus dem übergebenen, in
  // PDF-Konvention gespeicherten Crop hergeleitet und beim Übernehmen
  // wieder dorthin zurückgewandelt.
  let canvasCrop = { ...DEFAULT_PHOTO_CROP };
  let resolveOpen = null;
  let isDragging = false;
  let dragStart = null; // { clientX, clientY, crop }
  let previouslyFocusedElement = null;

  function toCanvasCrop(storedCrop) {
    const c = clampPhotoCrop(storedCrop);
    return { zoom: c.zoom, offsetX: c.offsetX, offsetY: -c.offsetY };
  }

  function toStoredCrop(workingCrop) {
    const c = clampPhotoCrop(workingCrop);
    return { zoom: c.zoom, offsetX: c.offsetX, offsetY: -c.offsetY };
  }

  function zoomToSliderValue(zoom) {
    return Math.round(((zoom - PHOTO_CROP_MIN_ZOOM) / (PHOTO_CROP_MAX_ZOOM - PHOTO_CROP_MIN_ZOOM)) * 100);
  }

  function sliderValueToZoom(value) {
    return PHOTO_CROP_MIN_ZOOM + (value / 100) * (PHOTO_CROP_MAX_ZOOM - PHOTO_CROP_MIN_ZOOM);
  }

  function setCanvasCrop(next) {
    canvasCrop = clampPhotoCrop(next);
    zoomSlider.value = String(zoomToSliderValue(canvasCrop.zoom));
    render();
  }

  function render() {
    if (!image) return;
    const layout = computePhotoCropLayout({
      sourceWidth: image.naturalWidth || image.width,
      sourceHeight: image.naturalHeight || image.height,
      targetWidth: STAGE_SIZE,
      targetHeight: STAGE_SIZE,
      photoCrop: canvasCrop,
    });

    ctx.clearRect(0, 0, STAGE_SIZE, STAGE_SIZE);
    ctx.drawImage(image, layout.offsetX, layout.offsetY, layout.drawWidth, layout.drawHeight);

    // Abgedunkelter Bereich außerhalb des Kreises (even-odd: äußeres
    // Rechteck minus Kreisfläche) plus grüner Kreisrand als sichtbare
    // Maske — entspricht dem späteren kreisrunden Foto-Feld im Flyer.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_SIZE, STAGE_SIZE);
    ctx.arc(STAGE_SIZE / 2, STAGE_SIZE / 2, STAGE_SIZE / 2, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(20, 20, 20, 0.55)";
    ctx.fill("evenodd");
    ctx.restore();

    ctx.beginPath();
    ctx.arc(STAGE_SIZE / 2, STAGE_SIZE / 2, STAGE_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#8cc140";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Verschiebt den Ausschnitt in normalisierten Schritten (unabhängig
  // von Bild-/Zoomgröße, siehe photoCrop.js) — dieselbe Vorzeichen-
  // konvention wie beim Drag (Bild folgt der "Richtung" direkt).
  function nudge(dx, dy) {
    setCanvasCrop({
      ...canvasCrop,
      offsetX: canvasCrop.offsetX - dx * NUDGE_STEP,
      offsetY: canvasCrop.offsetY - dy * NUDGE_STEP,
    });
  }

  function setZoom(zoom) {
    setCanvasCrop({ ...canvasCrop, zoom });
  }

  function pointerPosFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = STAGE_SIZE / rect.width;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  }

  function onPointerDown(event) {
    if (!image) return;
    canvas.setPointerCapture(event.pointerId);
    isDragging = true;
    dragStart = { pos: pointerPosFromEvent(event), crop: { ...canvasCrop } };
  }

  function onPointerMove(event) {
    if (!isDragging || !dragStart) return;
    const pos = pointerPosFromEvent(event);
    const deltaX = pos.x - dragStart.pos.x;
    const deltaY = pos.y - dragStart.pos.y;

    const layout = computePhotoCropLayout({
      sourceWidth: image.naturalWidth || image.width,
      sourceHeight: image.naturalHeight || image.height,
      targetWidth: STAGE_SIZE,
      targetHeight: STAGE_SIZE,
      photoCrop: dragStart.crop,
    });
    const slackX = layout.drawWidth - STAGE_SIZE;
    const slackY = layout.drawHeight - STAGE_SIZE;

    const nextOffsetX = slackX > 0 ? dragStart.crop.offsetX - deltaX / (slackX / 2) : dragStart.crop.offsetX;
    const nextOffsetY = slackY > 0 ? dragStart.crop.offsetY - deltaY / (slackY / 2) : dragStart.crop.offsetY;

    setCanvasCrop({ ...dragStart.crop, offsetX: nextOffsetX, offsetY: nextOffsetY });
  }

  function onPointerUp(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    isDragging = false;
    dragStart = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!image) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setZoom(canvasCrop.zoom + direction * WHEEL_ZOOM_STEP);
    },
    { passive: false }
  );

  canvas.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 3 : 1;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-step, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(step, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nudge(0, -step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudge(0, step);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(canvasCrop.zoom + WHEEL_ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(canvasCrop.zoom - WHEEL_ZOOM_STEP);
    }
  });

  zoomSlider.addEventListener("input", () => {
    setZoom(sliderValueToZoom(Number(zoomSlider.value)));
  });

  zoomOutBtn.addEventListener("click", () => setZoom(canvasCrop.zoom - WHEEL_ZOOM_STEP));
  zoomInBtn.addEventListener("click", () => setZoom(canvasCrop.zoom + WHEEL_ZOOM_STEP));

  nudgeUpBtn.addEventListener("click", () => nudge(0, -1));
  nudgeDownBtn.addEventListener("click", () => nudge(0, 1));
  nudgeLeftBtn.addEventListener("click", () => nudge(-1, 0));
  nudgeRightBtn.addEventListener("click", () => nudge(1, 0));

  resetBtn.addEventListener("click", () => setCanvasCrop(toCanvasCrop(DEFAULT_PHOTO_CROP)));

  function close(applied) {
    const result = { applied, crop: applied ? toStoredCrop(canvasCrop) : null };
    backdrop.hidden = true;
    document.removeEventListener("keydown", onKeyDown);
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
      previouslyFocusedElement.focus();
    }
    if (resolveOpen) {
      resolveOpen(result);
      resolveOpen = null;
    }
  }

  cancelBtn.addEventListener("click", () => close(false));
  closeBtn.addEventListener("click", () => close(false));
  applyBtn.addEventListener("click", () => close(true));

  // Klick auf den abgedunkelten Hintergrund verwirft die Änderung
  // (konsistent mit X/Escape) — ein Klick innerhalb des Dialogs selbst
  // löst dies nicht aus.
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close(false);
  });

  function focusableElements() {
    return Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.getClientRects().length > 0);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(false);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function open({ imageSrc, initialCrop } = {}) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    previouslyFocusedElement = document.activeElement;

    try {
      image = await loadImage(imageSrc);
    } catch {
      errorEl.textContent = "Foto konnte nicht geladen werden. Bitte erneut versuchen.";
      errorEl.hidden = false;
      image = null;
      return { applied: false, crop: null };
    }

    setCanvasCrop(toCanvasCrop(initialCrop ?? DEFAULT_PHOTO_CROP));

    backdrop.hidden = false;
    document.addEventListener("keydown", onKeyDown);
    canvas.focus();

    return new Promise((resolve) => {
      resolveOpen = resolve;
    });
  }

  return { open };
}
