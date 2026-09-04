import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhotoToPng } from "./normalizePhotoToPng.js";

const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==";

function makeFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    drawImageCalls: [],
    getContext() {
      return {
        fillStyle: null,
        fillRect() {},
        drawImage(...args) {
          canvas.drawImageCalls.push(args);
        },
      };
    },
    toDataURL(mimeType) {
      canvas.requestedMimeType = mimeType;
      return `data:${mimeType};base64,${TINY_JPEG_BASE64}`;
    },
  };
  return canvas;
}

test("normalizePhotoToPng: skaliert ein großes Foto auf die Zielauflösung herunter und liefert JPEG", async () => {
  const fakeImage = { naturalWidth: 4000, naturalHeight: 3000 };
  let lastCanvas;
  const result = await normalizePhotoToPng({
    dataUrl: "data:image/png;base64,irrelevant",
    deps: {
      loadImage: async () => fakeImage,
      createCanvas: () => {
        lastCanvas = makeFakeCanvas();
        return lastCanvas;
      },
    },
  });

  assert.equal(result.mimeType, "image/jpeg");
  assert.ok(result.bytes.length > 0);
  // 4000x3000 -> längste Kante auf 1600px begrenzt, Seitenverhältnis bleibt erhalten.
  assert.equal(lastCanvas.width, 1600);
  assert.equal(lastCanvas.height, 1200);
  assert.equal(lastCanvas.requestedMimeType, "image/jpeg");
});

test("normalizePhotoToPng: vergrößert ein bereits kleines Foto nicht", async () => {
  const fakeImage = { naturalWidth: 400, naturalHeight: 300 };
  let lastCanvas;
  await normalizePhotoToPng({
    dataUrl: "data:image/png;base64,irrelevant",
    deps: {
      loadImage: async () => fakeImage,
      createCanvas: () => {
        lastCanvas = makeFakeCanvas();
        return lastCanvas;
      },
    },
  });

  assert.equal(lastCanvas.width, 400);
  assert.equal(lastCanvas.height, 300);
});
