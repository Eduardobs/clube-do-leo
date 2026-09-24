import { STORE_CONFIG } from '../config/store';
import type { CartItem, Product } from '../types/product';
import { formatPrice } from './format';
import { cartTotal, findProduct } from './products';

export function buildConsultationMessage(product: Product): string {
  return `Olá! Gostaria de saber o valor do produto *${product.nome}* (código ${product.codigo}).`;
}

export function buildOrderMessage(customerName: string, cart: CartItem[], products: Product[]): string {
  const lines = cart.flatMap((item) => {
    const product = findProduct(products, item.codigo);
    if (!product) return [];
    return `- ${product.nome} (cód. ${product.codigo}): ${item.quantity} x ${formatPrice(product.valor)} = ${formatPrice(product.valor * item.quantity)}`;
  });

  return [
    `*Novo Pedido - ${STORE_CONFIG.name}*`,
    '',
    '*Itens do Pedido:*',
    ...lines,
    '',
    `*Total: ${formatPrice(cartTotal(cart, products))}*`,
    '',
    `*Cliente:* ${customerName.trim()}`,
    `Obrigado por comprar no ${STORE_CONFIG.name}!`,
  ].join('\n');
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
  const lines = cart.flatMap((item) => {
    const product = findProduct(products, item.codigo);
    if (!product) return [];
    if (product.valor <= 0) return `- ${product.nome} (cód. ${product.codigo}): ${item.quantity} un. — valor a confirmar`;
    return `- ${product.nome} (cód. ${product.codigo}): ${item.quantity} x ${formatPrice(product.valor)} = ${formatPrice(product.valor * item.quantity)}`;
  });
  const notes = details.notes?.trim();

  return [
    `*Novo Pedido - ${STORE_CONFIG.name}*`,
    `*Referência:* ${details.orderId}`,
    '',
    '*Itens do Pedido:*',
    ...lines,
    '',
    `*Subtotal estimado: ${formatPrice(cartTotal(cart, products))}*`,
    '_O valor final, a disponibilidade e eventuais custos adicionais serão confirmados pela loja._',
    '',
    `*Cliente:* ${details.customerName.trim()}`,
    ...(notes ? [`*Observações:* ${notes}`] : []),
    `Obrigado por comprar no ${STORE_CONFIG.name}!`,
  ].join('\n');
}

export function openWhatsApp(message: string): boolean {
  const url = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  return window.open(url, '_blank', 'noopener,noreferrer') !== null;
}
