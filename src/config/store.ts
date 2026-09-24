import type { Category } from '../types/product';

export const STORE_CONFIG = {
  name: 'Clube do Léo',
  whatsappNumber: '5551998450386',
  instagramUrl: 'https://www.instagram.com/clubedoleo_/',
  categories: ['Jogos', 'Brinquedos', 'Decorações', 'Utilidades'] satisfies Category[],
} as const;
