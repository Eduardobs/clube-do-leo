import type { Category } from '../types/product';

export const STORE_CONFIG = {
  name: 'Clube do Léo',
  siteUrl: 'https://clubedoleo.com.br',
  whatsappNumber: '5551998450386',
  instagramUrl: 'https://www.instagram.com/clubedoleo_/',
  maxQuantityPerProduct: 99,
  categories: ['Jogos', 'Brinquedos', 'Decorações', 'Utilidades'] satisfies Category[],
} as const;
