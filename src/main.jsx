import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SellYourStuff from './SellYourStuff'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SellYourStuff />
  </StrictMode>
)