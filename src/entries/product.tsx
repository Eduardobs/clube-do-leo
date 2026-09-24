import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductPageApp } from '../features/product/ProductPageApp';
import '../../styles/global.css';
import '../../styles/responsive.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');
document.body.classList.add('product-page-body');

createRoot(root).render(
  <StrictMode>
    <ProductPageApp />
  </StrictMode>,
);
