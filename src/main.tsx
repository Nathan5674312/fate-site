import { StrictMode, lazy, Suspense } from 'react'
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

/* The hands prototype, at /?lab=hands. Lazy, so it costs real visitors nothing. */
const Lab = lazy(() => import('./hands/Lab'))
const showLab =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('lab') === 'hands'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showLab ? (
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
