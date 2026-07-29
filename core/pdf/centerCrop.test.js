import { test } from "node:test";
import assert from "node:assert/strict";
import { centerCrop } from "./centerCrop.js";

test("quadratisches Bild in quadratische Fläche: keine Skalierung, kein Versatz", () => {
  const result = centerCrop({ sourceWidth: 100, sourceHeight: 100, targetWidth: 50, targetHeight: 50 });
  assert.equal(result.scale, 0.5);
  assert.equal(result.drawWidth, 50);
  assert.equal(result.drawHeight, 50);
  assert.equal(result.offsetX, 0);
  assert.equal(result.offsetY, 0);
});

test("breites Bild in quadratische Fläche: Höhe füllt exakt, Breite steht seitlich über (negativer Versatz)", () => {
  const result = centerCrop({ sourceWidth: 200, sourceHeight: 100, targetWidth: 50, targetHeight: 50 });
  // scale muss die Höhe exakt füllen: 100*scale = 50 -> scale=0.5
  assert.equal(result.scale, 0.5);
  assert.equal(result.drawHeight, 50);
  assert.equal(result.drawWidth, 100);
  // mittig: Versatz negativ, da drawWidth > targetWidth
  assert.equal(result.offsetX, (50 - 100) / 2);
  assert.equal(result.offsetY, 0);
});

test("hohes Bild in quadratische Fläche: Breite füllt exakt, Höhe steht über", () => {
  const result = centerCrop({ sourceWidth: 100, sourceHeight: 200, targetWidth: 50, targetHeight: 50 });
  assert.equal(result.drawWidth, 50);
  assert.equal(result.drawHeight, 100);
  assert.equal(result.offsetY, (50 - 100) / 2);
});

test("wirft bei nicht-positiven Maßen", () => {
  assert.throws(() => centerCrop({ sourceWidth: 0, sourceHeight: 10, targetWidth: 10, targetHeight: 10 }));
  assert.throws(() => centerCrop({ sourceWidth: 10, sourceHeight: -5, targetWidth: 10, targetHeight: 10 }));
});
