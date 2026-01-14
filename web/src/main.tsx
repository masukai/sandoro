import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './hooks/useSettings';
import { ThemeProvider } from './hooks/useTheme';
import { TagsProvider } from './hooks/useTags';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <TagsProvider>
          <App />
        </TagsProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>
);
