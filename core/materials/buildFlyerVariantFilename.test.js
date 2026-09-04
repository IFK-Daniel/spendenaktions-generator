import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlyerVariantFilename, buildFlyerVariantLabel } from "./buildFlyerVariantFilename.js";

test("Druckerei + du → _Du vor der Endung eingefügt", () => {
  assert.equal(
    buildFlyerVariantFilename("IFK_Max_Mustermann_Flyer_Druckerei.pdf", "du"),
    "IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf"
  );
});

test("Home + sie → _Sie vor der Endung eingefügt", () => {
  assert.equal(
    buildFlyerVariantFilename("IFK_Max_Mustermann_Flyer_Home.pdf", "sie"),
    "IFK_Max_Mustermann_Flyer_Home_Sie.pdf"
  );
});

test("unbekannte Variante wirft", () => {
  assert.throws(
    () => buildFlyerVariantFilename("IFK_Max_Mustermann_Flyer_Home.pdf", "ihr"),
    /unbekannte Ansprache-Variante/
  );
});

test("Dateiname ohne Endung wirft", () => {
  assert.throws(() => buildFlyerVariantFilename("ohne_endung", "du"), /ungültiger Basis-Dateiname/);
});

test("buildFlyerVariantLabel hängt sichtbares Suffix an", () => {
  assert.equal(buildFlyerVariantLabel("Flyer Druckerei", "du"), "Flyer Druckerei – Du");
  assert.equal(buildFlyerVariantLabel("Flyer Home", "sie"), "Flyer Home – Sie");
});

test("buildFlyerVariantLabel wirft bei unbekannter Variante", () => {
  assert.throws(() => buildFlyerVariantLabel("Flyer Home", "ihr"), /unbekannte Ansprache-Variante/);
});
