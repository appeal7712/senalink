import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/deckEditScrollModal.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { SuperAdminProvider } from './context/SuperAdminContext.jsx'
import { LoungeProvider } from './context/LoungeContext.jsx'
import { UserProfileProvider } from './context/UserProfileContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <SuperAdminProvider>
        <UserProfileProvider>
          <LoungeProvider>
            <App />
          </LoungeProvider>
        </UserProfileProvider>
      </SuperAdminProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
