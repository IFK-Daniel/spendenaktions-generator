export async function drawLogoOnCanvas(canvas, logoImage) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const logoSize = size * 0.18;
  const logoX = (size - logoSize) / 2;
  const logoY = (size - logoSize) / 2;

  const paddedSize = logoSize * 1.25;
  const paddedX = (size - paddedSize) / 2;
  const paddedY = (size - paddedSize) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(paddedX, paddedY, paddedSize, paddedSize);

  ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
}
