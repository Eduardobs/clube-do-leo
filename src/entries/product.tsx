import { standaloneRoot } from '../lib/standalone-root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductPageApp } from '../features/product/ProductPageApp';
import '../../styles/global.css';
import '../../styles/responsive.css';
import '../../styles/site.css';

const root = standaloneRoot();
document.body.classList.add('product-page-body');

createRoot(root).render(
  <StrictMode>
    <ProductPageApp />
  </StrictMode>,
);
