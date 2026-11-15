/**
 * Text recognition that runs in the visitor's browser (Tesseract, compiled
 * to WebAssembly). The image never leaves their computer.
 *
 * The engine and its English data are about 7 MB. They are part of this
 * site's own files, not fetched from anyone else's server, and are only
 * downloaded the first time a screenshot is read.
 */
import engineUrl from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import fastEngineUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url';
import workerUrl from 'tesseract.js/dist/worker.min.js?url';

/** The folder the English data is served from: scripts/ocrData.js puts it at ocr/eng.traineddata.gz. */
const LANGUAGE_FOLDER = 'ocr';

/** How Tesseract should look at the image: text scattered about a screen, or one line of it. */
const LAYOUT = { scattered: '11', page: '3', block: '6', line: '7' };

/** The smallest WebAssembly module that uses SIMD instructions; browsers that accept it can run the faster engine. */
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

const absolute = (url) => new URL(url, document.baseURI).href;

let starting = null;
/** Recognition jobs run one at a time, in the order they were asked for. */
let queue = Promise.resolve();

async function start() {
  const { createWorker } = await import('tesseract.js');
  const fast = WebAssembly.validate(SIMD_PROBE);
  // Engine mode 1: the neural-network recogniser only, which is all the engine files above contain.
  return createWorker('eng', 1, {
    workerPath: absolute(workerUrl),
    corePath: absolute(fast ? fastEngineUrl : engineUrl),
    langPath: absolute(LANGUAGE_FOLDER),
    // A plain same-origin worker, and nothing kept in the browser's storage.
    workerBlobURL: false,
    cacheMethod: 'none',
  });
}

/** The engine, started on first use. A failed start is forgotten so the next call tries again. */
function engine() {
  starting ??= start().catch((error) => {
    starting = null;
    throw error;
  });
  return starting;
}

/**
 * Reads the text in an image.
 *
 * @param {HTMLCanvasElement} image
 * @param {{ layout?: 'scattered' | 'line', only?: string }} options
 *        `only` limits the characters that can be read, e.g. '0123456789%'.
 * @returns {Promise<{ text: string, bbox: { x0, y0, x1, y1 }, words: { text: string, bbox: object }[] }[]>}
 *          the lines found, with where each one and each of its words is
 */
export function recognise(image, { layout = 'scattered', only = '' } = {}) {
  const job = queue.then(async () => {
    const worker = await engine();
    await worker.setParameters({
      tessedit_pageseg_mode: LAYOUT[layout],
      tessedit_char_whitelist: only,
      // Tesseract's running commentary ("Estimating resolution as…") would otherwise fill the console.
      debug_file: '/dev/null',
    });
    const { data } = await worker.recognize(image, {}, { text: false, blocks: true });
    return (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.map((line) => ({
          text: line.text.trim(),
          bbox: line.bbox,
          words: line.words.map((word) => ({ text: word.text, bbox: word.bbox })),
        })),
      ),
    );
  });
  // One failed job must not block the ones after it.
  queue = job.catch(() => {});
  return job;
}

/** Shuts the engine down and frees its memory. It starts again if needed. */
export function stopRecognising() {
  const running = starting;
  starting = null;
  running?.then((worker) => worker.terminate()).catch(() => {});
}
