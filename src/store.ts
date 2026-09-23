import { useSyncExternalStore } from 'react'
import type { Lang } from './data/cv'
import { isSectionId, type SectionId } from './sections'

export type View = 'mcr' | 'lite' | 'cv'

export interface State {
  lang: Lang
  view: View
  booted: boolean
  /** Source sitting on the preview bus (green). */
  preview: SectionId | null
  /** Source hovered in the 3D room — shown on the PVW monitor. */
  hover: SectionId | null
  /** Source on the program bus (red / on air). */
  onAir: SectionId | null
  panelOpen: boolean
  /** performance.now() of the last AUTO transition, drives the T-bar. */
  transitionAt: number
  /** performance.now() of the last key press per section, drives key travel. */
  pressedAt: Partial<Record<SectionId | 'cut' | 'auto', number>>
}

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage unavailable */
  }
}

function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get('lang')
  if (q === 'es' || q === 'en') return q
  const saved = safeGet('mcr-lang')
  if (saved === 'es' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const canRun3D = () =>
  supportsWebGL() && window.matchMedia('(min-width: 820px)').matches

function initialView(): View {
  if (location.hash === '#cv') return 'cv'
  const saved = safeGet('mcr-view')
  if (saved === 'lite') return 'lite'
  return canRun3D() ? 'mcr' : 'lite'
}

const hashSection = location.hash.slice(1)
const deepLinked = isSectionId(hashSection)

let state: State = {
  lang: initialLang(),
  view: initialView(),
  booted: deepLinked || location.hash === '#cv' || new URLSearchParams(location.search).has('noboot'),
  preview: null,
  hover: null,
  onAir: null,
  panelOpen: false,
  transitionAt: -1e9,
  pressedAt: {},
}

const listeners = new Set<() => void>()

export function getState() {
  return state
}

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

/* ---------- actions ---------- */

let timers: number[] = []
const clearTimers = () => {
  timers.forEach(clearTimeout)
  timers = []
}

function press(key: SectionId | 'cut' | 'auto') {
  setState({ pressedAt: { ...state.pressedAt, [key]: performance.now() } })
}

function setHash(h: string) {
  const url = h ? `#${h}` : location.pathname + location.search
  history.replaceState(null, '', url)
}

/**
 * Puts a section on air the way a vision mixer does it:
 * select on preview → AUTO transition → program. The panel opens once the
 * camera has flown into the monitor.
 */
export function take(id: SectionId, opts: { instant?: boolean } = {}) {
  clearTimers()
  press(id)
  if (state.view !== 'mcr' || opts.instant) {
    setState({ preview: id, onAir: id, panelOpen: true, transitionAt: performance.now() })
    setHash(id)
    return
  }
  if (state.panelOpen && state.onAir) {
    // Already inside a monitor: hard cut straight to the new source.
    press('cut')
    setState({ preview: id, onAir: id, transitionAt: performance.now() })
    setHash(id)
    return
  }
  setState({ preview: id })
  timers.push(
    window.setTimeout(() => {
      press('auto')
      setState({ onAir: id, transitionAt: performance.now() })
    }, 260),
    window.setTimeout(() => setState({ panelOpen: true }), 1050),
  )
  setHash(id)
}

export function backToMultiviewer() {
  clearTimers()
  setState({ panelOpen: false, onAir: null, preview: null })
  setHash('')
}

export function setLang(lang: Lang) {
  safeSet('mcr-lang', lang)
  document.documentElement.lang = lang
  setState({ lang })
}

export function setView(view: View) {
  clearTimers()
  if (view !== 'cv') safeSet('mcr-view', view)
  setState({ view, panelOpen: false, onAir: null, preview: null, hover: null })
  setHash(view === 'cv' ? 'cv' : '')
  window.scrollTo(0, 0)
}

export function finishBoot() {
  setState({ booted: true })
}

/** Called once on load and on hashchange so deep links like /#experience work. */
export function syncFromHash() {
  const h = location.hash.slice(1)
  if (h === 'cv') {
    if (state.view !== 'cv') setState({ view: 'cv', panelOpen: false, onAir: null })
    return
  }
  if (isSectionId(h)) {
    if (state.view === 'cv') setState({ view: canRun3D() ? 'mcr' : 'lite' })
    if (state.onAir !== h || !state.panelOpen) take(h, { instant: true })
  }
}
