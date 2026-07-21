const PAYPAL_URL_REGEX =
  /https?:\/\/(www\.)?paypal\.com\/[^\s"'<>]+|https?:\/\/(www\.)?paypal\.me\/[^\s"'<>]+/i;

export function extractPaypalLink(text) {
  const match = text.match(PAYPAL_URL_REGEX);
  if (!match) return null;
  return match[0].replace(/[),.]+$/, "");
}
