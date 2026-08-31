import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/*
 * Tells the CSS that JS is alive, which is what allows the hero to hide itself
 * before animating. Set BEFORE render and synchronously, so there is no frame
 * where the finished composition paints and then vanishes. If this line never
 * runs - blocked script, bundle error, old browser - nothing is ever hidden and
 * the fold renders complete without motion.
 */
document.documentElement.classList.add('motion')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
