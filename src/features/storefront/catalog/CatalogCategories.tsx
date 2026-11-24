import { Coffee, Grid2X2, House, PawPrint, Puzzle } from 'lucide-react';
import { STORE_CONFIG } from '../../../config/store';
import type { Category } from '../../../types/product';

const categoryIcons = { Jogos: Puzzle, Brinquedos: PawPrint, Decorações: House, Utilidades: Coffee } satisfies Record<Category, typeof Puzzle>;

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
            data-category={category}
            type="button"
            className={`header-pill${isActive ? ' is-active' : ''}`}
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
