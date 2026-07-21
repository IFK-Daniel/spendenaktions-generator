const CAMPAIGN_TITLE_REGEX = /für\s+(.+?)(?:[.!?\n]|$)/i;

export function extractCampaignTitle(text) {
  const match = text.match(CAMPAIGN_TITLE_REGEX);
  if (!match) return null;
  const title = match[1].trim();
  return title || null;
}
