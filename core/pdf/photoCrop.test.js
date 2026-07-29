import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampPhotoCrop,
  computePhotoCropLayout,
  DEFAULT_PHOTO_CROP,
  PHOTO_CROP_MAX_ZOOM,
  PHOTO_CROP_MIN_ZOOM,
} from "./photoCrop.js";

test("ohne photoCrop entspricht das Ergebnis dem automatischen Center-Crop", () => {
  const result = computePhotoCropLayout({ sourceWidth: 200, sourceHeight: 100, targetWidth: 50, targetHeight: 50 });
  assert.equal(result.scale, 0.5);
  assert.equal(result.drawWidth, 100);
  assert.equal(result.drawHeight, 50);
  assert.equal(result.offsetX, (50 - 100) / 2);
  assert.equal(result.offsetY, 0);
});

test("photoCrop mit Standardwerten (zoom 1, offset 0) entspricht ebenfalls dem Center-Crop", () => {
  const result = computePhotoCropLayout({
    sourceWidth: 200,
    sourceHeight: 100,
    targetWidth: 50,
    targetHeight: 50,
    photoCrop: DEFAULT_PHOTO_CROP,
  });
  assert.equal(result.offsetX, (50 - 100) / 2);
  assert.equal(result.offsetY, 0);
});

test("Mindestzoom (1) verhindert leere Bereiche unabhängig vom Offset", () => {
  const result = computePhotoCropLayout({
    sourceWidth: 200,
    sourceHeight: 100,
    targetWidth: 50,
    targetHeight: 50,
    photoCrop: { zoom: 1, offsetX: 1, offsetY: 1 },
  });
  // Bei zoom=1 füllt die Höhe exakt die Zielfläche (kein Spielraum) —
  // ein Offset auf dieser Achse darf daher keine Wirkung haben.
  assert.equal(result.drawHeight, 50);
  assert.equal(result.offsetY, 0);
  // Auf der Breiten-Achse besteht Spielraum; extremes Offset schiebt das
  // Bild bis an den Rand, aber nie darüber hinaus (kein leerer Bereich).
  assert.ok(result.offsetX <= 0);
  assert.ok(result.offsetX >= 50 - result.drawWidth);
});

test("Offset wird unabhängig vom Zoom stets auf den zulässigen Bereich begrenzt (kein Leerraum)", () => {
  for (const zoom of [1, 1.5, 2, 3]) {
    for (const offsetX of [-1, -0.5, 0, 0.5, 1]) {
      for (const offsetY of [-1, -0.5, 0, 0.5, 1]) {
        const result = computePhotoCropLayout({
          sourceWidth: 300,
          sourceHeight: 150,
          targetWidth: 60,
          targetHeight: 60,
          photoCrop: { zoom, offsetX, offsetY },
        });
        assert.ok(result.offsetX <= 0.0001, `offsetX ${result.offsetX} sollte <= 0 sein`);
        assert.ok(result.offsetY <= 0.0001, `offsetY ${result.offsetY} sollte <= 0 sein`);
        assert.ok(
          result.offsetX >= 60 - result.drawWidth - 0.0001,
          `Bild darf Zielfläche links/rechts nicht verlassen`
        );
        assert.ok(
          result.offsetY >= 60 - result.drawHeight - 0.0001,
          `Bild darf Zielfläche oben/unten nicht verlassen`
        );
      }
    }
  }
});

test("clampPhotoCrop begrenzt zoom auf [MIN, MAX] und offset auf [-1, 1]", () => {
  assert.deepEqual(clampPhotoCrop({ zoom: 0, offsetX: -5, offsetY: 5 }), {
    zoom: PHOTO_CROP_MIN_ZOOM,
    offsetX: -1,
    offsetY: 1,
  });
  assert.deepEqual(clampPhotoCrop({ zoom: 99, offsetX: 0.3, offsetY: -0.2 }), {
    zoom: PHOTO_CROP_MAX_ZOOM,
    offsetX: 0.3,
    offsetY: -0.2,
  });
});

test("clampPhotoCrop füllt fehlende/ungültige Werte mit dem Standardzustand", () => {
  assert.deepEqual(clampPhotoCrop(), DEFAULT_PHOTO_CROP);
  assert.deepEqual(clampPhotoCrop({}), DEFAULT_PHOTO_CROP);
  assert.deepEqual(clampPhotoCrop({ zoom: NaN, offsetX: undefined, offsetY: null }), DEFAULT_PHOTO_CROP);
});

test("normalisierte Crop-Werte sind unabhängig von der Editor-/Zielgröße (gleiche relative Position)", () => {
  const smallTarget = computePhotoCropLayout({
    sourceWidth: 400,
    sourceHeight: 300,
    targetWidth: 100,
    targetHeight: 100,
    photoCrop: { zoom: 2, offsetX: 0.5, offsetY: -0.5 },
  });
  const largeTarget = computePhotoCropLayout({
    sourceWidth: 400,
    sourceHeight: 300,
    targetWidth: 500,
    targetHeight: 500,
    photoCrop: { zoom: 2, offsetX: 0.5, offsetY: -0.5 },
  });
  // Gleicher relativer Ausschnitt: Verhältnis von Offset zu Zielgröße
  // bleibt über verschieden große Zielflächen hinweg gleich.
  assert.ok(Math.abs(smallTarget.offsetX / 100 - largeTarget.offsetX / 500) < 1e-9);
  assert.ok(Math.abs(smallTarget.offsetY / 100 - largeTarget.offsetY / 500) < 1e-9);
});

test("wirft bei nicht-positiven Maßen", () => {
  assert.throws(() => computePhotoCropLayout({ sourceWidth: 0, sourceHeight: 10, targetWidth: 10, targetHeight: 10 }));
});
