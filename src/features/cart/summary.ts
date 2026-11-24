import type { CartItem, Product } from '../../types/product';
import { configurationError, isQuote, normalizeQuantity, productSignature } from '../../lib/product-rules';

export function indexProducts(products: Product[]): Map<string, Product> {
  const index = new Map<string, Product>();
  for (const product of products) index.set(product.codigo, product);
  return index;
}

export const itemKey = (item: CartItem) => item.id || item.codigo;

function itemIssue(product: Product, item: CartItem): string {
  if (normalizeQuantity(product, item.quantity) !== item.quantity) return 'Revise a quantidade mínima e o incremento.';
  const error = configurationError(product, item.personalizacoes);
  if (error) return error;
  if (item.catalogSignature && item.catalogSignature !== productSignature(product)) return 'As condições do produto mudaram. Revise e salve o item.';
  return '';
}

export interface CartSummary {
  lines: { item: CartItem; product: Product | undefined; issue: string }[];
  total: number;
  count: number;
  hasPricedItems: boolean;
  hasQuoteItems: boolean;
  canCheckout: boolean;
}

export function summarizeCart(items: CartItem[], productsByCode: ReadonlyMap<string, Product>): CartSummary {
  let count = 0;
  let total = 0;
  let hasPricedItems = false;
  let hasQuoteItems = false;
  let canCheckout = items.length > 0;
  const lines = items.map(item => {
    const product = productsByCode.get(item.codigo);
    const issue = product ? itemIssue(product, item) : '';
    if (!product || issue) canCheckout = false;
    if (product) {
      count += item.quantity;
      if (isQuote(product)) {
        hasQuoteItems = true;
      } else {
        hasPricedItems = true;
        total += item.quantity * product.valor;
      }
    }
    return { item, product, issue };
  });

  return { lines, count, total, hasPricedItems, hasQuoteItems, canCheckout };
}
