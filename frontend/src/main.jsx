import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeTheme } from './app/utils/themeUtils';
import { ThemeProvider } from './contexts/ThemeContext';

// Initialize theme as early as possible to prevent flash
// This must happen before any React rendering
initializeTheme();

// Small delay to ensure DOM is ready for theme application
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  )
};

// Use requestAnimationFrame to ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  requestAnimationFrame(renderApp);
}
