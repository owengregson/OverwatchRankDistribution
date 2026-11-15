/**
 * Prepares a screenshot for upload, entirely in the browser.
 *
 * The image is redrawn onto a canvas, scaled down if it is very large, and
 * re-encoded. That keeps uploads small, and because only the pixels are
 * kept, anything hidden in the original file (location, device details and
 * other metadata) is dropped before it leaves the visitor's computer.
 */

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Largest file we will try to read. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
/** Longest side of the uploaded image, in pixels. Plenty to read a percentage from. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

const encode = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

/**
 * @param {Blob} file an image from a file picker, a drop or the clipboard
 * @returns {Promise<{ blob: Blob, extension: 'webp' | 'jpg', width: number, height: number }>}
 */
export async function prepareImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Use a PNG, JPEG or WebP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large. Use one under 20 MB.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file could not be read as an image.');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP is smallest; browsers that cannot write it hand back something else, so fall back to JPEG.
  let blob = await encode(canvas, 'image/webp');
  if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg');
  if (!blob) throw new Error('That image could not be processed.');

  return {
    blob,
    extension: blob.type === 'image/webp' ? 'webp' : 'jpg',
    width: canvas.width,
    height: canvas.height,
  };
}

/** 183400 → "179 KB" */
export function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
