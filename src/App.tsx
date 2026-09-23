import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react'
import { SECTIONS } from './sections'
import { backToMultiviewer, getState, setState, syncFromHash, take, useStore } from './store'
import Boot from './ui/Boot'
import { McrHud, TopBar } from './ui/Hud'
import Lite from './ui/Lite'
import SectionPanel from './ui/SectionPanel'
import SimpleCV from './ui/SimpleCV'

const ControlRoom = lazy(() => import('./scene/ControlRoom'))

/** If WebGL blows up at runtime, drop to the 2D multiviewer instead of a blank page. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    setState({ view: 'lite' })
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      const s = getState()
      if (s.view === 'cv' || !s.booted) return
      if (e.key === 'Escape' && s.panelOpen) {
        backToMultiviewer()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= SECTIONS.length) {
        // Otherwise the digit lands in the terminal input once it mounts.
        e.preventDefault()
        take(SECTIONS[n - 1].id)
        return
      }
      if ((e.key === 'Enter' || e.key === ' ') && target === document.body) {
        const next = s.preview ?? s.hover
        if (next) {
          e.preventDefault()
          take(next)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  const view = useStore((s) => s.view)
  const booted = useStore((s) => s.booted)
  const lang = useStore((s) => s.lang)
  useKeyboard()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  return (
    <div className={`app view-${view}`}>
      <a className="skip-link" href="#cv">
        {lang === 'es' ? 'Ver CV en texto' : 'View plain-text CV'}
      </a>
      <TopBar />
      {view === 'mcr' && (
        <>
          <SceneBoundary>
            <Suspense fallback={<div className="scene-loading">MCR-01 · loading signal…</div>}>
              <ControlRoom />
            </Suspense>
          </SceneBoundary>
          {booted && <McrHud />}
        </>
      )}
      {view === 'lite' && <Lite />}
      {view === 'cv' && <SimpleCV />}
      {view !== 'cv' && <SectionPanel />}
      {!booted && view !== 'cv' && <Boot />}
    </div>
  )
}
