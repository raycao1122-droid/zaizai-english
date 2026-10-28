/** Respect the repository subdirectory used by GitHub Pages. */
export function assetUrl(file: string) {
  return `${import.meta.env.BASE_URL}assets/${file}`;
}
