import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SupabaseSettingsProvider } from './hooks/useSupabaseSettings';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <SupabaseSettingsProvider>
          <App />
        </SupabaseSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
