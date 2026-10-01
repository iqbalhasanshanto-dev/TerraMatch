import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SavedLocationsProvider } from './context/SavedLocationsContext.jsx'
import 'leaflet/dist/leaflet.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SavedLocationsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SavedLocationsProvider>
    </ThemeProvider>
  </React.StrictMode>
)
