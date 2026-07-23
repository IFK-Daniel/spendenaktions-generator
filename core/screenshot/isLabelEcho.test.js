import { test } from "node:test";
import assert from "node:assert/strict";
import { isLabelEcho } from "./isLabelEcho.js";

test("bekannte Feldbeschriftungen werden erkannt", () => {
  assert.equal(isLabelEcho("Mail-Adresse"), true);
  assert.equal(isLabelEcho("IFK-Mailadresse"), true);
  assert.equal(isLabelEcho("Paypal-URL"), true);
  assert.equal(isLabelEcho("IFK-ID"), true);
});

test("echte Werte werden nicht als Beschriftung erkannt", () => {
  assert.equal(isLabelEcho("Daniel"), false);
  assert.equal(isLabelEcho("d.feigenbutz@its-for-kids.de"), false);
});
