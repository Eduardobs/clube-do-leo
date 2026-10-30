import { standaloneRoot } from '../lib/standalone-root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PricingPolicyApp } from '../features/pricing-policy/PricingPolicyApp';
import '../../styles/global.css';
import '../../styles/responsive.css';
import '../../styles/site.css';

const root = standaloneRoot();
document.body.classList.add('institutional-page-body');

createRoot(root).render(
  <StrictMode>
    <PricingPolicyApp />
  </StrictMode>,
);
