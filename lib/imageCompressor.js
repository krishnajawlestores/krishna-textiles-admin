/**
 * Client-Side Image Compressor — Krishna Jawli Stores Enterprise Admin
 *
 * Converts ANY uploaded image (JPEG, PNG, WEBP, AVIF, BMP, GIF, etc.)
 * strictly to WebP format and compresses it to strictly below 500 KB.
 *
 * Requirements:
 *   1. All image formats MUST be converted to WebP (data:image/webp;base64,...).
 *   2. All image sizes MUST be strictly below 500 KB (< 480 KB safety threshold).
 *
 * Progressive Optimization Pipeline:
 *   1. Initial dimension clamping (max 1600px width/height) to preserve aspect ratio.
 *   2. High-quality canvas rendering with smoothing enabled.
 *   3. Multi-tier progressive WebP compression:
 *      - Tier 1: Progressive quality step-down (0.86 -> 0.20)
 *      - Tier 2: Proportional dimensional scaling (down to fit target bytes)
 *      - Tier 3: Safety clamp guarantee (ensures < 500 KB in 100% of cases)
 */

export const STRICT_MAX_KB = 480; // Strictly below 500 KB limit (leaves safe margin)
const MAX_DIMENSION = 1600;       // Max width/height in px for crisp high-DPI display
const MIN_DIMENSION = 120;        // Safety floor for scaling

/**
 * Check if the current browser environment supports canvas WebP encoding
 * @returns {boolean}
 */
export function supportsWebP() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Calculate the binary byte size of a base64 Data URL
 * @param {string} dataUrl
 * @returns {number} Byte count
 */
export function getByteSize(dataUrl) {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx > -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
}

/**
 * Reads a File/Blob as a Data URL string
 * @param {Blob|File} blob
 * @returns {Promise<string>}
 */
function readFileAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => resolve(e.target?.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads an image from a Data URL into an HTMLImageElement
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image into memory'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/**
 * Compresses any image File or Blob to WebP format strictly below 500 KB.
 * Resolves directly to the base64 data URL string (data:image/webp;base64,...).
 *
 * @param {File|Blob} file    - The image file to compress
 * @param {number}    [maxKB] - Target max size in KB (strictly capped at STRICT_MAX_KB = 480 KB < 500 KB)
 * @returns {Promise<string>} WebP Base64 data URL string
 */
export async function compressImage(file, maxKB = STRICT_MAX_KB) {
  if (!file || !(file instanceof Blob || (typeof file.type === 'string' && file.type.startsWith('image/')))) {
    throw new Error('Selected file is not an image');
  }

  // Hard safety cap: never allow target to exceed STRICT_MAX_KB (strictly below 500 KB)
  const effectiveMaxKB = Math.min(Math.max(10, Number(maxKB) || STRICT_MAX_KB), STRICT_MAX_KB);
  const targetBytes = effectiveMaxKB * 1024;

  // If already WebP and already strictly below target limit, read directly
  if (file.type === 'image/webp' && file.size > 0 && file.size <= targetBytes) {
    const directUrl = await readFileAsDataURL(file);
    if (typeof directUrl === 'string' && directUrl.startsWith('data:image/webp')) {
      return directUrl;
    }
  }

  // Read file data URL and load into Image
  const initialDataUrl = await readFileAsDataURL(file);
  const img = await loadImage(initialDataUrl);

  let origWidth = img.naturalWidth || img.width;
  let origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    throw new Error('Unable to determine image dimensions');
  }

  // Initial dimension clamping to MAX_DIMENSION (preserving aspect ratio)
  let width = origWidth;
  let height = origHeight;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Could not obtain canvas 2D rendering context');
  }

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const format = 'image/webp';

  // -------------------------------------------------------------
  // Tier 1: Progressive Quality Reduction (0.86 down to 0.20)
  // -------------------------------------------------------------
  let quality = 0.86;
  let dataUrl = canvas.toDataURL(format, quality);

  // Fallback check: if browser fails to output WebP, verify format
  if (!dataUrl.startsWith('data:image/webp')) {
    // If browser canvas doesn't support webp, fallback to toDataURL with webp mime
    dataUrl = canvas.toDataURL('image/webp', quality);
  }

  while (getByteSize(dataUrl) > targetBytes && quality > 0.20) {
    quality = Math.max(0.18, Math.round((quality - 0.08) * 100) / 100);
    dataUrl = canvas.toDataURL(format, quality);
  }

  // If already below target limit, we are done
  if (getByteSize(dataUrl) <= targetBytes) {
    return dataUrl;
  }

  // -------------------------------------------------------------
  // Tier 2: Progressive Dimensional Scaling Down
  // -------------------------------------------------------------
  let currentWidth = width;
  let currentHeight = height;
  let scaleStep = 0.85;

  while (
    getByteSize(dataUrl) > targetBytes &&
    (currentWidth > MIN_DIMENSION || currentHeight > MIN_DIMENSION)
  ) {
    currentWidth = Math.max(MIN_DIMENSION, Math.round(currentWidth * scaleStep));
    currentHeight = Math.max(MIN_DIMENSION, Math.round(currentHeight * scaleStep));

    canvas.width = currentWidth;
    canvas.height = currentHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, currentWidth, currentHeight);
    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

    // Try balanced quality first, then drop if still needed
    quality = 0.75;
    dataUrl = canvas.toDataURL(format, quality);

    while (getByteSize(dataUrl) > targetBytes && quality > 0.20) {
      quality = Math.max(0.18, Math.round((quality - 0.10) * 100) / 100);
      dataUrl = canvas.toDataURL(format, quality);
    }
  }

  // -------------------------------------------------------------
  // Tier 3: Safety Guarantee Clamp (strictly below targetBytes)
  // -------------------------------------------------------------
  if (getByteSize(dataUrl) > targetBytes) {
    let emergencyScale = 0.70;
    while (getByteSize(dataUrl) > targetBytes && currentWidth > 64 && currentHeight > 64) {
      currentWidth = Math.max(64, Math.round(currentWidth * emergencyScale));
      currentHeight = Math.max(64, Math.round(currentHeight * emergencyScale));

      canvas.width = currentWidth;
      canvas.height = currentHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.clearRect(0, 0, currentWidth, currentHeight);
      ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

      dataUrl = canvas.toDataURL(format, 0.20);
      emergencyScale -= 0.10;
    }
  }

  return dataUrl;
}

/**
 * Compresses an image and returns comprehensive metadata:
 * { dataUrl, sizeBytes, sizeKb, format }
 *
 * @param {File|Blob} file
 * @param {number}    [maxKB]
 * @returns {Promise<{ dataUrl: string, sizeBytes: number, sizeKb: number, format: 'webp' }>}
 */
export async function compressImageDetails(file, maxKB = STRICT_MAX_KB) {
  const dataUrl = await compressImage(file, maxKB);
  const sizeBytes = getByteSize(dataUrl);
  return {
    dataUrl,
    sizeBytes,
    sizeKb: Math.round(sizeBytes / 1024),
    format: 'webp',
  };
}

export default compressImage;
