// Sprite Asset Loader & Background Chroma Key Manager

const imageCache = new Map();

/**
 * Processes an image to remove white/light-grey backgrounds around 2.5D isometric sprites,
 * converting opaque background pixels to true transparent alpha.
 */
function processWhiteBackground(img) {
  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth;
    offCanvas.height = img.naturalHeight;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Key out near-white background pixels (R>230, G>230, B>230)
      if (r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0; // Alpha transparent
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    const processedImg = new Image();
    processedImg.src = offCanvas.toDataURL('image/png');
    processedImg.isLoaded = true;
    return processedImg;
  } catch (e) {
    return img;
  }
}

/**
 * Preloads or retrieves a cached transparent sprite image
 */
export function getAssetImage(path) {
  if (!imageCache.has(path)) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = path;
    img.isLoaded = false;

    img.onload = () => {
      const transparentImg = processWhiteBackground(img);
      imageCache.set(path, transparentImg);
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
    if (fallbackFn) {
      fallbackFn();
    }
  }
}

/**
 * Draws a sprite image with optional rotation (in radians) around its center.
 * Used for auto-tiling roads where the same asset is rotated to match orientation.
 */
export function drawRotatedSpriteOrFallback(ctx, spritePath, screenX, screenY, width, height, rotationRad, fallbackFn) {
  const img = getAssetImage(spritePath);

  if (img && img.isLoaded && img.naturalWidth > 0) {
    ctx.save();

    const drawX = screenX - width / 2;
    const drawY = screenY - height + 10;

    const centerX = drawX + width / 2;
    const centerY = drawY + height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);

    ctx.restore();
  } else {
    if (fallbackFn) {
      fallbackFn();
    }
  }
}
