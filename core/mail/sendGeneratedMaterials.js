export async function sendGeneratedMaterials({ email, campaignTitle, paypalLink, infoOptIn, attachments }) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, campaignTitle, paypalLink, infoOptIn, attachments }),
  });

  const result = await response.json();

  return { ok: response.ok && result.ok, error: result.error };
}
