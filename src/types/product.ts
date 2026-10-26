export type Category = 'Jogos' | 'Brinquedos' | 'Decorações' | 'Utilidades';

export interface PersonalizationField {
  id: string;
  label: string;
  required?: boolean;
  maxLength?: number;
  options?: string[];
}

export interface Product {
  modalidadePreco?: 'definido' | 'consulta';
  resumo?: string;
  unidadeVenda?: string;
  quantidadeMinima?: number;
  incremento?: number;
  pecasPorKit?: number;
  dimensoes?: string;
  material?: string;
  conteudo?: string;
  cuidados?: string;
  indicacaoUso?: string;
  prazoProducao?: string;
  informacoesPersonalizacao?: string;
  personalizacoes?: PersonalizationField[];
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
  id?: string;
  personalizacoes?: Record<string, string>;
  catalogSignature?: string;
  codigo: string;
  quantity: number;
}
