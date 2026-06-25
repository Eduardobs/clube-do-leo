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
    'Lembrancinhas',
    'Festas',
    'Presentes',
    'CANECAS',
    'CUIAS',
    'GARRAFAS',
    'BALÕES',
    'CESTAS',
    'CAMISETAS',
    'PANTUFAS',
    'MOUSEPAD',
    'AVENTAIS',
    'TOALHAS',
    'MOCHILAS',
    'AZULEJOS',
    'ADESIVOS',
    'AGENDAS',
  ],
  subcategorias: {
    CANECAS: ['TÉRMICAS', 'CERÂMICA', 'XICARAS', 'TORRE DE XICARAS', 'CHOPP DE VIDRO', 'CHOPP DE ALUMINIO', 'JARRO'],
    CUIAS: ['PORONGO', 'MADEIRA', 'BOMBAS', 'ERVAS', 'ENFEITES'],
    GARRAFAS: ['ALUMÍNIO', 'TÉRMICAS'],
    CAMISETAS: ['ADULTO', 'INFANTIL', 'BODYS'],
  },
};

if (typeof module !== 'undefined') module.exports = CONFIG;
