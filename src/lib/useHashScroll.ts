import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Zu einem Abschnitt springen, wenn die Adresse einen #anker hat (z. B. /chemie#rechner) */
export function useHashScroll() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [hash])
}
