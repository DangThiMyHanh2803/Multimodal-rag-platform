import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GLOBAL_CSS } from './styles/theme'
import App from './App.tsx'

const style = document.createElement('style')
style.textContent = GLOBAL_CSS
document.head.appendChild(style)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
