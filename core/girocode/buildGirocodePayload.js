export function buildGirocodePayload({ empfaenger, iban, bic, betrag, verwendungszweck }) {
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
