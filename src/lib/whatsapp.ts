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
    return `- ${product.nome} (${product.codigo}): ${item.quantity} x ${formatPrice(product.valor)} = ${formatPrice(product.valor * item.quantity)}`;
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
    `Obrigado por comprar na ${STORE_CONFIG.name}!`,
  ].join('\n');
}

export function openWhatsApp(message: string): void {
  const url = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
