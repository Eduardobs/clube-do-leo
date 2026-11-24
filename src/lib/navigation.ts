const KEY = 'clubeDoLeo.catalog';

export function catalogParams(search: string): URLSearchParams {
  const input = new URLSearchParams(search);
  const filters = new URLSearchParams();
  for (const name of ['busca', 'categoria', 'ordem', 'preco', 'ate']) {
    const value = input.get(name);
    if (value) filters.set(name, value);
  }
  return filters;
}

export function catalogUrl(cart = false): string {
  let search = '';
  try { search = sessionStorage.getItem(KEY) || ''; } catch { /* optional persistence */ }
  const params = catalogParams(search);
  if (cart) params.set('carrinho', '1');
  return `/${params.size ? `?${params}` : ''}#produtos`;
}
export function saveCatalog(search: string) {
  try { sessionStorage.setItem(KEY, catalogParams(search).toString()); } catch { /* URL remains usable */ }
}
