import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TbAuditApp from './TbAuditApp';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TbAuditApp />
  </StrictMode>,
);
