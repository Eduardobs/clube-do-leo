import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from '../features/admin/AdminApp';
import '../../styles/global.css';
import '../../styles/admin.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
