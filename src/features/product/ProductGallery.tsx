import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { imageFallback, productThumbnailUrl, resolveAsset } from '../../lib/format';
import type { Product } from '../../types/product';

export function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStart = useRef(0);
  const images = product.imagens;
  const selectedImage = resolveAsset(images[index]);

  function move(direction: number) {
    if (images.length > 1) {
      setIndex(current => (current + direction + images.length) % images.length);
    }
  }

  return (
    <div className="product-detail__gallery product-page__gallery">
      <button type="button" className="gallery-enlarge" aria-label="Ampliar imagem" onClick={() => setZoom(true)}>
        <img id="detail-main-image" src={selectedImage} alt={product.nome} width="800" height="800" decoding="async" fetchPriority="high" onError={imageFallback} />
        {images.length > 1 && <span className="gallery-count" aria-hidden="true">{index + 1} / {images.length}</span>}
        <span className="gallery-zoom-icon"><ZoomIn aria-hidden="true" /></span>
      </button>
      {images.length > 1 && (
        <div className="product-detail__thumbs" aria-label="Galeria de imagens">
          {images.map((image, position) => (
            <button key={position} type="button" className={`product-detail__thumb${index === position ? ' is-active' : ''}`}
              aria-pressed={index === position} onClick={() => setIndex(position)} aria-label={`Ver imagem ${position + 1} de ${product.nome}`}>
              <img src={productThumbnailUrl(image)} alt="" loading="lazy" decoding="async" width="80" height="80" onError={imageFallback} />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <Modal className="modal__content--gallery" label="Imagem ampliada" onClose={() => setZoom(false)}>
          <div
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                move(event.key === 'ArrowRight' ? 1 : -1);
              }
            }}
            onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
            onTouchEnd={event => {
              const distance = event.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1);
            }}
          >
            <img className="zoom-image" src={selectedImage} alt={product.nome} onError={imageFallback} />
            {images.length > 0 && (
              <div className="gallery-navigation">
                <button type="button" className="btn btn--ghost gallery-navigation__arrow" aria-label="Imagem anterior" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button>
                <span aria-live="polite">Imagem {index + 1} de {images.length}</span>
                <button type="button" className="btn btn--ghost gallery-navigation__arrow" aria-label="Próxima imagem" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
