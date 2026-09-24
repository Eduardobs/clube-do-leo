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
  if (/^(?:[a-z]+:|\/\/|data:|blob:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\.?\//, '')}`;
}

export const BRAND_LOGO_URL = brandLogoUrl;
export const HEADER_TOYS_URL = headerToysUrl;

export function imageFallback(event: React.SyntheticEvent<HTMLImageElement>): void {
  const fallback = resolveAsset(undefined);
  if (event.currentTarget.src !== new URL(fallback, document.baseURI).href) {
    event.currentTarget.src = fallback;
  }
}
