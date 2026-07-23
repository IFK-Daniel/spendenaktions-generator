import { test } from "node:test";
import assert from "node:assert/strict";
import { isAustrianFederalState } from "./detectAustrianFederalState.js";

test("alle neun österreichischen Bundesländer werden erkannt", () => {
  const states = [
    "Burgenland",
    "Kärnten",
    "Niederösterreich",
    "Oberösterreich",
    "Salzburg",
    "Steiermark",
    "Tirol",
    "Vorarlberg",
    "Wien",
  ];
  for (const state of states) {
    assert.equal(isAustrianFederalState(state), true, state);
  }
});

test("Länderkürzel AT wird erkannt", () => {
  assert.equal(isAustrianFederalState("AT"), true);
  assert.equal(isAustrianFederalState("at"), true);
});

test("Groß-/Kleinschreibung und Leerzeichen werden toleriert", () => {
  assert.equal(isAustrianFederalState("  wien  "), true);
  assert.equal(isAustrianFederalState("TIROL"), true);
});

test("deutsche Bundesländer werden nicht als österreichisch erkannt", () => {
  assert.equal(isAustrianFederalState("NRW"), false);
  assert.equal(isAustrianFederalState("Bayern"), false);
});

test("ungültige Eingaben liefern false", () => {
  assert.equal(isAustrianFederalState(""), false);
  assert.equal(isAustrianFederalState(undefined), false);
});
