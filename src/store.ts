import { useSyncExternalStore } from 'react'
import type { Lang } from './data/cv'
import { gpuInfo } from './gpu'
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
  /** The 2D view was picked because WebGL runs without a GPU; shows a notice. */
  softwareFallback: boolean
  /** Side panels of the 3D view slid out of the way. */
  hudHidden: boolean
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

/** The 3D room is offered on wide screens with WebGL. */
export const canRun3D = () => gpuInfo().webgl && window.matchMedia('(min-width: 820px)').matches

/**
 * It is only picked by default when WebGL runs on a real GPU: emulated WebGL
 * (hardware acceleration off) makes the room crawl and heats up the machine.
 */
export const prefers3D = () => canRun3D() && !gpuInfo().software

function initialView(): View {
  if (location.hash === '#cv') return 'cv'
  const q = new URLSearchParams(location.search).get('view')
  if (q === '3d' && canRun3D()) return 'mcr'
  if (q === '2d') return 'lite'
  const saved = safeGet('mcr-view')
  if (saved === 'lite') return 'lite'
  if (saved === 'mcr' && canRun3D()) return 'mcr'
  return prefers3D() ? 'mcr' : 'lite'
}

const hashSection = location.hash.slice(1)
const deepLinked = isSectionId(hashSection)

const firstView = initialView()

let state: State = {
  lang: initialLang(),
  view: firstView,
  softwareFallback: firstView === 'lite' && canRun3D() && gpuInfo().software,
  hudHidden: safeGet('mcr-hud') === 'off',
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

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
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
  setState({ view, panelOpen: false, onAir: null, preview: null, hover: null, softwareFallback: false })
  setHash(view === 'cv' ? 'cv' : '')
  window.scrollTo(0, 0)
}

export function toggleHud() {
  const hudHidden = !state.hudHidden
  safeSet('mcr-hud', hudHidden ? 'off' : 'on')
  setState({ hudHidden })
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  else document.documentElement.requestFullscreen?.().catch(() => {})
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
    if (state.view === 'cv') setState({ view: prefers3D() ? 'mcr' : 'lite' })
    if (state.onAir !== h || !state.panelOpen) take(h, { instant: true })
  }
}
