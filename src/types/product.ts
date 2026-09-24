export type Category = 'Jogos' | 'Brinquedos' | 'Decorações' | 'Utilidades';

export interface Product {
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  imagens: string[];
  categorias: Category[];
}

export interface ProductsFile {
  produtos: Product[];
}

export interface CartItem {
  codigo: string;
  quantity: number;
}
