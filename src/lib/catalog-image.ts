/** Catalog paths are project filenames, including names with spaces and accents. */
export function catalogImagePath(input: string): string | undefined {
  const path = input.trim().replace(/^\.?\//, '');
  if (!path.startsWith('assets/') || !/\.(?:avif|gif|jpe?g|png|webp)$/i.test(path)) return;
  const segments = path.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /[%?#\\\x00-\x1f\x7f]/.test(segment))) return;
  return path;
}

export function isUploadedImage(value: string): boolean {
  return /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/i.test(value);
}
