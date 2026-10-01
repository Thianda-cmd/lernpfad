import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (reset: () => void, error: Error) => ReactNode
}

interface State {
  error: Error | null
}

/** Fängt Fehler in einem Teilbaum ab, statt die ganze Seite leer werden zu lassen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LernLabor-Fehler:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.reset, error)
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 40 }}>
          <h3>Hier ist etwas schiefgelaufen</h3>
          <p>Die Seite konnte nicht angezeigt werden. Lade sie neu – dein Lernfortschritt bleibt gespeichert.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn--primary" onClick={() => location.reload()}>
              Seite neu laden
            </button>
            <button className="btn" onClick={this.reset}>
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    )
  }
}
