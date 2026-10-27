import { standaloneRoot } from '../lib/standalone-root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from '../features/admin/AdminApp';
import '../../styles/global.css';
import '../../styles/admin.css';

const root = standaloneRoot();

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
