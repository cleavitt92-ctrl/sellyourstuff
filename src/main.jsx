import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SellYourStuff from './Sellyourstuff'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SellYourStuff />
  </StrictMode>
)