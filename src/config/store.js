const CONFIG = {
  loja: {
    nome: 'Clube do Léo',
  },
  sistema: {
    moeda: 'R$',
  },
  whatsapp: {
    number: '5551998450386',
  },
  social: {
    instagram: 'https://www.instagram.com/clubedoleo_/',
  },
  categorias: [
    'Canecas',
    'Cuias',
    'Garrafas',
    'Balões',
    'Cestas',
    'Camisetas',
    'Pantufas',
    'Mousepad',
    'Aventais',
    'Toalhas',
    'Mochilas',
    'Azulejos',
    'Adesivos',
    'Agendas',
  ],
  subcategorias: {
    Canecas: ['Térmicas', 'Cerâmica', 'Xicaras', 'Torre de xícaras', 'Chopp de vidro', 'Chopp de aluminio', 'Jarro'],
    Cuias: ['Porongo', 'Madeira', 'Bombas', 'Ervas', 'Enfeites'],
    Garrafas: ['Alumínio', 'Térmicas'],
    Camisetas: ['Adulto', 'Infantil', 'Bodys'],
  },
};

if (typeof module !== 'undefined') module.exports = CONFIG;
