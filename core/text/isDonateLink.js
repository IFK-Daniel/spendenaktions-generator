const DONATE_LINK_REGEX = /paypal\.com\/donate/i;

export function isDonateLink(link) {
  return DONATE_LINK_REGEX.test(link);
}
