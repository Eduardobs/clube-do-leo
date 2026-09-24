import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PricingPolicyApp } from '../features/pricing-policy/PricingPolicyApp';
import '../../styles/global.css';
import '../../styles/responsive.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');
document.body.classList.add('institutional-page-body');

createRoot(root).render(
  <StrictMode>
    <PricingPolicyApp />
  </StrictMode>,
);
