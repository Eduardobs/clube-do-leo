import { standaloneRoot } from '../lib/standalone-root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StorefrontApp } from '../features/storefront/StorefrontApp';
import '../../styles/global.css';
import '../../styles/responsive.css';
import '../../styles/site.css';
import '../../styles/storefront.css';

const root = standaloneRoot();

createRoot(root).render(
  <StrictMode>
    <StorefrontApp />
  </StrictMode>,
);
