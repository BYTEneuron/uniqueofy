import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Global scroll-to-top on every route change.
 * Placed once inside <BrowserRouter> — no per-component logic needed.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
