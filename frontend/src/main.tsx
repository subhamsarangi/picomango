import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')!;

// Hide the initial loader immediately when JS starts executing
const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  setTimeout(() => {
    initialLoader.style.opacity = '0';
    setTimeout(() => {
      initialLoader.style.display = 'none';
      if ((window as any).__loadTimer) clearInterval((window as any).__loadTimer);
    }, 300);
  }, 200);
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
