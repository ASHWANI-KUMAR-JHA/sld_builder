import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GlobalLoader from './components/GlobalLoader.jsx'
import { installFetchInterceptor } from './utils/loaderStore'

// Patch fetch once so every network request toggles the global loader.
installFetchInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <GlobalLoader />
  </StrictMode>,
)
