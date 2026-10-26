const KEY = 'clubeDoLeo.catalog';
export function catalogUrl(cart = false): string {
  let search = '';
  try { search = sessionStorage.getItem(KEY) || ''; } catch { /* optional persistence */ }
  const params = new URLSearchParams(search);
  if (cart) params.set('carrinho', '1');
  return `/${params.size ? `?${params}` : ''}#produtos`;
}
export function saveCatalog(search: string) {
  try { sessionStorage.setItem(KEY, search); } catch { /* URL remains usable */ }
}
