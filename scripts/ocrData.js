/**
 * Vite plugin: makes the text reader's English data part of the site.
 *
 * The screenshot reader on the submit page (src/lib/screenshot/ocr.js) runs
 * Tesseract in the visitor's browser. Tesseract asks for its language data
 * by name, "<folder>/eng.traineddata.gz", so the file has to sit at a fixed
 * address rather than under one of Vite's hashed asset names. This copies
 * it out of node_modules to `ocr/eng.traineddata.gz` in the built site, and
 * serves it from the same address while developing, so it is never fetched
 * from anyone else's server.
 */
import { createReadStream, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Where the data is served, relative to the site's root. Keep in step with ocr.js. */
export const OCR_DATA_PATH = 'ocr/eng.traineddata.gz';

const source = fileURLToPath(
  new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', import.meta.url),
);

export function ocrData() {
  return {
    name: 'ocr-data',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== `/${OCR_DATA_PATH}`) return next();
        response.setHeader('Content-Type', 'application/gzip');
        // Kept by the browser, as the built site's host does: the page fetches it ahead of time and the reader's worker reuses that copy.
        response.setHeader('Cache-Control', 'max-age=600');
        createReadStream(source).pipe(response);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: OCR_DATA_PATH, source: readFileSync(source) });
    },
  };
}
