import brandLogoUrl from '../../assets/brand/header-logo-medallion.webp';
import { catalogImagePath, isUploadedImage } from './catalog-image';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

export function formatPrice(value: number | null | undefined): string {
  return value && value > 0 ? currencyFormatter.format(value).replace(/\u00a0/g, ' ') : 'Sob consulta';
}

export function resolveAsset(path: string | undefined): string {
  const value = path?.trim();
  if (!value) return brandLogoUrl;
  if (isUploadedImage(value)) return value;
  const asset = catalogImagePath(value);
  return asset ? `${import.meta.env.BASE_URL}${asset}` : brandLogoUrl;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function slugify(value: string): string {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function productPageUrl(name: string, code: string): string {
  return `${import.meta.env.BASE_URL}produto-${slugify(`${name}-${code}`)}/`;
}

export function productThumbnailUrl(path: string | undefined): string {
  const asset = catalogImagePath(path ?? '');
  if (!asset) return resolveAsset(path);
  const slash = asset.lastIndexOf('/');
  return `${import.meta.env.BASE_URL}${asset.slice(0, slash)}/thumbs/${asset.slice(slash + 1)}`;
}

export const BRAND_LOGO_URL = brandLogoUrl;

export function imageFallback(event: React.SyntheticEvent<HTMLImageElement>): void {
  const fallback = resolveAsset(undefined);
  if (event.currentTarget.src !== new URL(fallback, document.baseURI).href) {
    event.currentTarget.src = fallback;
  }
}
