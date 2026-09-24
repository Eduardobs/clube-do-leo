import brandLogoUrl from '../../assets/brand/header-logo-medallion.webp';
import headerToysUrl from '../../assets/brand/header-toys.webp';

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
  if (/^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i.test(value) || /^blob:/i.test(value)) return value;
  if (/^(?:[a-z]+:|\/\/)/i.test(value)) return brandLogoUrl;
  return `${import.meta.env.BASE_URL}${value.replace(/^\.?\//, '')}`;
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
  return `${import.meta.env.BASE_URL}produto-${slugify(`${name}-${code}`)}.html`;
}

export function productThumbnailUrl(path: string | undefined): string {
  const value = path?.trim();
  if (!value || /^(?:data:|blob:)/i.test(value)) return resolveAsset(value);
  if (/^(?:[a-z]+:|\/\/)/i.test(value)) return resolveAsset(undefined);
  const cleanPath = value.replace(/^\.?\//, '');
  const slash = cleanPath.lastIndexOf('/');
  const directory = slash >= 0 ? cleanPath.slice(0, slash) : '';
  const filename = slash >= 0 ? cleanPath.slice(slash + 1) : cleanPath;
  return resolveAsset(`${directory}/thumbs/${filename}`);
}

export const BRAND_LOGO_URL = brandLogoUrl;
export const HEADER_TOYS_URL = headerToysUrl;

export function imageFallback(event: React.SyntheticEvent<HTMLImageElement>): void {
  const fallback = resolveAsset(undefined);
  if (event.currentTarget.src !== new URL(fallback, document.baseURI).href) {
    event.currentTarget.src = fallback;
  }
}
