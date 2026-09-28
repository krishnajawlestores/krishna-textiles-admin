/**
 * Client-Side Image Compressor — Krishna Textiles Enterprise Admin
 *
 * Converts any uploaded image (JPEG, PNG, WEBP, etc.) to WebP format
 * and compresses it to strictly below 500 KB.
 *
 * Progressive optimization strategy:
 *   1. Initial dimension clamping (max 1600px)
 *   2. WebP encoding with progressive quality reduction (0.88 -> 0.25)
 *   3. Dimension scale-down fallback if needed
 *   4. Graceful fallback to JPEG only if WebP is unsupported by client
 */

const DEFAULT_MAX_KB = 490; // Strictly under 500 KB limit
const MAX_DIMENSION = 1600;  // Max width/height in px for crisp high-DPI display

/** Check if the browser supports canvas WebP output */
function supportsWebP() {
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

/** Calculate real byte size of a base64 Data URL */
function getByteSize(dataUrl) {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx > -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
}

/**
 * Compress an image File or Blob to WebP format (< 500 KB).
 * Resolves directly to the base64 data URL string for seamless drop-in compatibility.
 *
 * @param {File|Blob} file    - The image file to compress
 * @param {number}    [maxKB] - Target max size in KB (default: 490 KB, strictly < 500 KB)
 * @returns {Promise<string>} Base64 data URL string (data:image/webp;base64,...)
 */
export async function compressImage(file, maxKB = DEFAULT_MAX_KB) {
  const targetBytes = (maxKB || DEFAULT_MAX_KB) * 1024;

  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob || (typeof file.type === 'string' && file.type.startsWith('image/')))) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));

      img.onload = () => {
        try {
          const isWebPSupported = supportsWebP();
          const format = isWebPSupported ? 'image/webp' : 'image/jpeg';

          let width = img.width;
          let height = img.height;

          // Initial max dimension check
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          let canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          let ctx = canvas.getContext('2d');

          // If fallback is JPEG, fill white background to avoid transparent alpha turning black
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Phase 1: Progressive quality compression
          let quality = 0.88;
          let dataUrl = canvas.toDataURL(format, quality);

          while (getByteSize(dataUrl) > targetBytes && quality > 0.25) {
            quality = Math.round((quality - 0.08) * 100) / 100;
            dataUrl = canvas.toDataURL(format, quality);
          }

          // Phase 2: Dimension scale-down if still above target limit
          if (getByteSize(dataUrl) > targetBytes) {
            let scale = 0.8;
            while (getByteSize(dataUrl) > targetBytes && scale >= 0.35) {
              const sw = Math.round(width * scale);
              const sh = Math.round(height * scale);
              canvas.width = sw;
              canvas.height = sh;
              ctx = canvas.getContext('2d');
              if (format === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sw, sh);
              }
              ctx.drawImage(img, 0, 0, sw, sh);
              dataUrl = canvas.toDataURL(format, Math.max(0.65, quality));
              scale -= 0.15;
            }
          }

          // Phase 3: Final safety clamp
          if (getByteSize(dataUrl) > targetBytes) {
            dataUrl = canvas.toDataURL(format, 0.25);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image and return comprehensive details (dataUrl, sizeKb, format).
 *
 * @param {File|Blob} file
 * @param {number} [maxKB]
 * @returns {Promise<{ dataUrl: string, sizeKb: number, format: 'webp' | 'jpeg' }>}
 */
export async function compressImageDetails(file, maxKB = DEFAULT_MAX_KB) {
  const dataUrl = await compressImage(file, maxKB);
  const sizeBytes = getByteSize(dataUrl);
  return {
    dataUrl,
    sizeKb: Math.round(sizeBytes / 1024),
    format: dataUrl.startsWith('data:image/webp') ? 'webp' : 'jpeg',
  };
}

export default compressImage;
