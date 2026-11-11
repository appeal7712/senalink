import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DuelMockApp from './DuelMockApp';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DuelMockApp />
  </StrictMode>,
);
