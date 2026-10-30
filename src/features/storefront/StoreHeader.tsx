import { Camera, Coffee, Grid2X2, House, MessageCircle, PawPrint, Puzzle, ShoppingCart } from 'lucide-react';
import { STORE_CONFIG } from '../../config/store';
import { BRAND_LOGO_URL } from '../../lib/format';
import type { Category } from '../../types/product';

const categoryIcons = { Jogos: Puzzle, Brinquedos: PawPrint, Decorações: House, Utilidades: Coffee } satisfies Record<Category, typeof Puzzle>;
const categoryClass = { Jogos: 'sage', Brinquedos: 'coral', Decorações: 'blue', Utilidades: 'gold' } satisfies Record<Category, string>;

interface CategoryProps {
  activeCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
}

export function CatalogCategories({ activeCategory, onCategoryChange }: CategoryProps) {
  return (
    <div className="header-pills" aria-label="Categorias de produtos">
      <button
        type="button"
        className={`header-pill header-pill--all${activeCategory === null ? ' is-active' : ''}`}
        aria-pressed={activeCategory === null}
        onClick={() => onCategoryChange(null)}
      >
        <span><Grid2X2 aria-hidden="true" /></span>Todos
      </button>
      {STORE_CONFIG.categories.map((category) => {
        const Icon = categoryIcons[category];
        const isActive = activeCategory === category;
        return (
          <button
            key={category}
            type="button"
            className={`header-pill header-pill--${categoryClass[category]}${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onCategoryChange(isActive ? null : category)}
          >
            <span><Icon aria-hidden="true" /></span>{category}
          </button>
        );
      })}
    </div>
  );
}

interface StoreHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
}

export function StoreHeader({ cartCount, onOpenCart }: StoreHeaderProps) {
  return (
    <header id="top" className="store-header">
      <div className="container store-topbar">
        <a href="#top" className="store-brand">
          <img src={BRAND_LOGO_URL} alt="" width="44" height="44" />
          <span>Clube do Léo{' '}<small>CRIAÇÕES EM IMPRESSÃO 3D</small></span>
        </a>
        <nav className="store-links" aria-label="Navegação principal">
          <a href="#produtos">Catálogo</a>
          <a href="#como-comprar">Como comprar</a>
          <a href={STORE_CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Camera aria-hidden="true" /></a>
        </nav>
        <div className="store-actions">
          <a className="store-contact" aria-label="Vamos conversar pelo WhatsApp" href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /><span>Vamos conversar</span></a>
          <button type="button" className="store-cart" onClick={onOpenCart} aria-label={`Abrir carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}>
            <ShoppingCart aria-hidden="true" /><span className="store-cart__count">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
