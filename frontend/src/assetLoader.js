// Sprite Asset Loader & Fallback Manager

const imageCache = new Map();

/**
 * Preloads or retrieves a cached sprite image
 */
export function getAssetImage(path) {
  if (!imageCache.has(path)) {
    const img = new Image();
    img.src = path;
    img.isLoaded = false;

    img.onload = () => {
      img.isLoaded = true;
    };
    img.onerror = () => {
      img.isFailed = true;
    };

    imageCache.set(path, img);
    return img;
  }
  return imageCache.get(path);
}

/**
 * Draws a sprite image if loaded, or executes a 2.5D fallback rendering function if missing
 */
export function drawSpriteOrFallback(ctx, spritePath, screenX, screenY, width, height, fallbackFn) {
  const img = getAssetImage(spritePath);

  if (img && img.isLoaded && img.naturalWidth > 0) {
    ctx.save();
    ctx.drawImage(img, screenX - width / 2, screenY - height + 10, width, height);
    ctx.restore();
  } else {
    // Fallback: Execute custom 2.5D diamond/block draw function
    if (fallbackFn) {
      fallbackFn();
    }
  }
}
