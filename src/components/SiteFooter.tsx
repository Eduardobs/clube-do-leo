import { Camera, MessageCircle } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';
import { BRAND_LOGO_URL } from '../lib/format';

interface SiteFooterProps {
  compact?: boolean;
}

export function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="container footer__inner">
        <img src={BRAND_LOGO_URL} alt="Clube do Léo" className="footer__logo" />
        {!compact ? (
          <div className="footer__social">
            <a href={STORE_CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Camera aria-hidden="true" />
            </a>
            <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <MessageCircle aria-hidden="true" />
            </a>
          </div>
        ) : null}
        <p className="footer__copy">© {new Date().getFullYear()} Clube do Léo. Todos os direitos reservados.</p>
        <div className="footer__links">
          {compact ? <a href="./index.html">Página inicial</a> : (
            <>
              <a href="./politica-de-precos.html">Política de preços</a>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
