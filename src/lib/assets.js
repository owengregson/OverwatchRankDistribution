/**
 * Resolves image files in `assets/images` to URLs the bundler can serve.
 * Components ask for images by file name, so nothing else needs to know
 * where assets live or how they are hashed.
 */
const modules = import.meta.glob('../../assets/images/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const urlByFile = new Map(
  Object.entries(modules).map(([path, url]) => [path.split('/').pop(), url]),
);

export function imageUrl(file) {
  const url = urlByFile.get(file);
  if (!url) throw new Error(`Missing image "${file}" in assets/images.`);
  return url;
}
