import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StorefrontApp } from '../features/storefront/StorefrontApp';
import '../../styles/global.css';
import '../../styles/responsive.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <StorefrontApp />
  </StrictMode>,
);
