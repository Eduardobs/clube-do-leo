import type { ReactNode } from 'react';
import { BRAND_LOGO_URL } from '../lib/format';
import { catalogUrl } from '../lib/navigation';

export function PageHeader({ children }: { children: ReactNode }) {
  return (
    <header className="institutional-header">
      <div className="container institutional-header__inner">
        <a href={catalogUrl()} className="page-brand" aria-label="Clube do Léo, página inicial">
          <img src={BRAND_LOGO_URL} alt="Clube do Léo" width="44" height="44" />
          <span>Clube do Léo</span>
        </a>
        <nav className="page-header__actions" aria-label="Navegação da página">{children}</nav>
      </div>
    </header>
  );
}
