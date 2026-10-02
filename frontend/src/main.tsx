import React from 'react';
import ReactDOM from 'react-dom/client';
import './services/api'; // installs auth interceptors
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
