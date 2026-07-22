import { test } from "node:test";
import assert from "node:assert/strict";
import { getPhotoRetrievalErrorMessage } from "./getPhotoRetrievalErrorMessage.js";

test("beginnt immer mit dem vorgegebenen Basissatz", () => {
  for (const reason of ["http_error", "timeout", "redirect_login", "invalid_content_type", undefined]) {
    assert.match(getPhotoRetrievalErrorMessage(reason), /^Das Foto konnte nicht geladen werden\./);
  }
});

test("unterscheidet http_error", () => {
  assert.match(getPhotoRetrievalErrorMessage("http_error"), /abgerufen werden/);
});

test("unterscheidet timeout", () => {
  assert.match(getPhotoRetrievalErrorMessage("timeout"), /Zeitüberschreitung/);
});

test("unterscheidet redirect_login", () => {
  assert.match(getPhotoRetrievalErrorMessage("redirect_login"), /Anmelde-/);
});

test("unterscheidet invalid_content_type", () => {
  assert.match(getPhotoRetrievalErrorMessage("invalid_content_type"), /enthält kein Bild/);
});

test("liefert nur den Basissatz bei unbekannter/fehlender Ursache", () => {
  assert.equal(getPhotoRetrievalErrorMessage(undefined), "Das Foto konnte nicht geladen werden.");
  assert.equal(getPhotoRetrievalErrorMessage("irgendwas"), "Das Foto konnte nicht geladen werden.");
});
