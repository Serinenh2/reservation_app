import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/i18n' // must load before components use t()
import '@/styles/index.css'
import Providers from '@/app/providers'
import App from '@/App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
)
