import { STORE_CONFIG } from '../config/store';
import type { CartItem, Product } from '../types/product';
import { formatPrice, productPageUrl } from './format';
import { isQuote, quantityLabel, cartTotal, findProduct } from './products';

export function buildConsultationMessage(product: Product, quantity = 1, personalizacoes: Record<string, string> = {}): string {
  return ['*Solicitação de orçamento*', itemLine(product, { codigo: product.codigo, quantity, personalizacoes }), 'Feito sob encomenda. Prazo de produção a combinar. Entrega e condições finais serão combinadas com a loja.'  ].join('\n');
}
function itemLine(p: Product, item: CartItem): string {
  return [`- ${p.nome} (cód. ${p.codigo}): ${quantityLabel(p, item.quantity)}`,
    `${STORE_CONFIG.siteUrl}${productPageUrl(p.nome, p.codigo)}`,
    isQuote(p) ? 'Preço sob consulta — solicitar orçamento' : `${item.quantity} x ${formatPrice(p.valor)} = ${formatPrice(p.valor * item.quantity)}`,
    ...Object.entries(item.personalizacoes || {}).map(([key, value]) => `${p.personalizacoes?.find(f => f.id === key)?.label || key}: ${value}`),
].join('\n');
}
export function buildOrderMessage(customerName: string, cart: CartItem[], products: Product[]): string {
  return buildDetailedOrderMessage({ orderId: '', customerName }, cart, products);
}

export interface OrderMessageDetails {
  orderId: string;
  customerName: string;
  notes?: string;
}

export function createOrderId(now = new Date()): string {
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
    .join('');
  const values = new Uint16Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  const suffix = (values[0] || Math.floor(Math.random() * 0xffff)).toString(36).toUpperCase().padStart(3, '0').slice(-3);
  return `CDL-${date}-${suffix}`;
}

export function buildDetailedOrderMessage(
  details: OrderMessageDetails,
  cart: CartItem[],
  products: Product[],
): string {
  const lines = cart.flatMap(item => {
    const product = findProduct(products, item.codigo);
    return product ? [itemLine(product, item)] : [];
  });
  const notes = details.notes?.trim();

  return [
    `*${cart.every(item => { const p = findProduct(products, item.codigo); return p && isQuote(p); }) ? 'Solicitação de orçamento' : 'Solicitação de pedido'} - ${STORE_CONFIG.name}*`,
    `*Referência:* ${details.orderId}`,
    '',
    '*Itens da solicitação:*',
    ...lines,
    '',
    ...(cart.some(item => { const p = findProduct(products, item.codigo); return p && !isQuote(p); }) ? [`*Subtotal dos produtos: ${formatPrice(cartTotal(cart, products))}*`] : []),
    'Entrega a combinar, separada do prazo de produção. Itens sob consulta não integram o subtotal. Condições finais serão confirmadas pela loja.',
    '',
    `*Cliente:* ${details.customerName.trim()}`,
    ...(notes ? [`*Observações:* ${notes}`] : []),
    'Feito sob encomenda. Produzimos após a confirmação do pedido. Esta solicitação não confirma contratação, pagamento ou produção.',
  ].join('\n');
}

export function openWhatsApp(message: string): boolean {
  const url = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  try { return window.open(url, '_blank', 'noopener,noreferrer') !== null; } catch { return false; }
}
