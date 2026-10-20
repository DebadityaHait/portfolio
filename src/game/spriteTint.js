// Build a reusable alpha mask once. White sprite details (eyes and cutouts)
// become transparent so recoloring preserves the original pixel artwork.
export function spriteMask(image, x = 0, y = 0, width = image.naturalWidth, height = image.naturalHeight) {
  const mask = document.createElement('canvas');
  mask.width = width; mask.height = height;
  const ctx = mask.getContext('2d');
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const shade = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.round(data[i + 3] * Math.min(1, (255 - shade) / 172));
  }
  ctx.putImageData(pixels, 0, 0);
  return mask;
}

export function tintSprite(ctx, mask, color) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, mask.width, mask.height);
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.globalCompositeOperation = 'source-over';
}
