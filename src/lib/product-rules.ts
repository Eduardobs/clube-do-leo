import { STORE_CONFIG } from '../config/store';
import type { Product } from '../types/product';

export const isQuote = (product: Product) => product.modalidadePreco === 'consulta' || (!product.modalidadePreco && product.valor === 0);
export const minimum = (product: Product) => product.quantidadeMinima ?? 1;
export const increment = (product: Product) => product.incremento ?? 1;

export function normalizeQuantity(product: Product, quantity: number): number {
  const min = minimum(product);
  const step = increment(product);
  const maxSteps = Math.floor((STORE_CONFIG.maxQuantityPerProduct - min) / step);
  const requested = Number.isFinite(quantity) ? Math.max(min, quantity) : min;
  const steps = Math.min(maxSteps, Math.ceil((requested - min) / step));
  return min + steps * step;
}

export function quantityLabel(product: Product, quantity: number): string {
  let unit = product.unidadeVenda || 'un.';
  if (quantity !== 1 && unit === 'kit') unit = 'kits';
  if (quantity !== 1 && unit === 'unidade') unit = 'unidades';
  const pieces = product.pecasPorKit ? ` · ${quantity * product.pecasPorKit} peças` : '';
  return `${quantity} ${unit}${pieces}`;
}

export function productSignature(product: Product): string {
  // A ordem dos campos faz parte da assinatura gravada em carrinhos existentes.
  return JSON.stringify([
    product.valor, product.modalidadePreco, product.unidadeVenda, product.quantidadeMinima,
    product.incremento, product.pecasPorKit, product.personalizacoes,
  ]);
}

export function configurationError(product: Product, values: Record<string, string> = {}): string {
  const fields = product.personalizacoes ?? [];
  for (const field of fields) {
    const value = Object.hasOwn(values, field.id) ? values[field.id].trim() : '';
    if (field.required && !value) return `Preencha ${field.label}.`;
    if (field.maxLength && value.length > field.maxLength) return `${field.label}: limite de ${field.maxLength} caracteres.`;
    if (value && field.options && !field.options.includes(value)) return `Revise ${field.label}.`;
  }
  if (Object.keys(values).some(key => !fields.some(field => field.id === key))) {
    return 'As opções mudaram. Revise a personalização.';
  }
  return '';
}
