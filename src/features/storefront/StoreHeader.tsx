import { Camera, Coffee, Grid2X2, Heart, House, MessageCircle, PawPrint, Puzzle, ShoppingCart } from 'lucide-react';
import { STORE_CONFIG } from '../../config/store';
import { BRAND_LOGO_URL, HEADER_TOYS_URL } from '../../lib/format';
import type { Category } from '../../types/product';

const categoryIcons = {
  Jogos: Puzzle,
  Brinquedos: PawPrint,
  Decorações: House,
  Utilidades: Coffee,
} satisfies Record<Category, typeof Puzzle>;

const categoryClass = {
  Jogos: 'sage',
  Brinquedos: 'coral',
  Decorações: 'blue',
  Utilidades: 'gold',
} satisfies Record<Category, string>;

interface StoreHeaderProps {
  activeCategory: Category | null;
  cartCount: number;
  onCategoryChange: (category: Category | null) => void;
  onOpenCart: () => void;
}

export function StoreHeader({ activeCategory, cartCount, onCategoryChange, onOpenCart }: StoreHeaderProps) {
  return (
    <header id="top" className="site-header site-header--storefront">
      <div className="container header-showcase">
        <a href="#top" className="brand brand--seal" aria-label="Clube do Léo, início">
          <img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__medallion" />
        </a>

        <div className="header-showcase__center">
          <nav className="site-nav site-nav--header" aria-label="Navegação principal">
            <a href={STORE_CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Camera /></a>
            <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
            <button type="button" className="cart-btn" onClick={onOpenCart} aria-label={`Abrir carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}>
              <ShoppingCart aria-hidden="true" />
              <span className="cart-btn__badge">{cartCount}</span>
            </button>
          </nav>
          <div className="header-showcase__sparkles" aria-hidden="true">♡</div>
          <h1>Produtos 3D</h1>
          <div className="header-showcase__line" aria-hidden="true" />
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
          <p className="header-showcase__tagline"><Heart aria-hidden="true" /> Qualidade, criatividade e diversão que você pode ver e tocar! <Heart aria-hidden="true" /></p>
        </div>

        <img src={HEADER_TOYS_URL} className="header-showcase__toys" alt="Brinquedos coloridos que representam o catálogo de produtos 3D" width="900" height="600" />
      </div>
    </header>
  );
}
