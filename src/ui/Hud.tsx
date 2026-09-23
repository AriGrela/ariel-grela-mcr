import { cv, tr } from '../data/cv'
import { useT } from '../i18n'
import { SECTIONS, sectionById } from '../sections'
import { canRun3D, setLang, setState, setView, take, useStore, type View } from '../store'
import { CtaRow, Timecode } from './common'

export function TopBar() {
  const { t, lang } = useT()
  const view = useStore((s) => s.view)
  const onAir = useStore((s) => s.onAir)
  const views: View[] = canRun3D() ? ['mcr', 'lite', 'cv'] : ['lite', 'cv']
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setView(view === 'cv' ? (canRun3D() ? 'mcr' : 'lite') : view)}>
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-name">ARIEL GRELA</span>
        <span className="brand-sub">MCR-01</span>
      </button>

      {view !== 'cv' && (
        <div className="topbar-status" aria-live="polite">
          <span className={`onair-pill ${onAir ? 'on' : ''}`}>{onAir ? t.onAir : t.standby}</span>
          <span className="pgm-label">
            {t.pgm}: <b>{onAir ? tr(sectionById(onAir).label, lang).toUpperCase() : 'SLATE'}</b>
          </span>
          <Timecode />
        </div>
      )}

      <div className="topbar-controls">
        <div className="seg" role="group" aria-label="View">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'active' : ''}
              aria-pressed={view === v}
              title={t.viewTitles[v]}
              onClick={() => setView(v)}
            >
              {t.views[v]}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Language">
          {(['es', 'en'] as const).map((l) => (
            <button key={l} type="button" className={lang === l ? 'active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Overlays that frame the 3D room: identity on the left, source list on the right. */
export function McrHud() {
  const { t, lang } = useT()
  const hover = useStore((s) => s.hover)
  const preview = useStore((s) => s.preview)
  const onAir = useStore((s) => s.onAir)
  const panelOpen = useStore((s) => s.panelOpen)
  if (panelOpen) return null
  return (
    <>
      <aside className="hud hud-left">
        <p className="hud-kicker">{tr(cv.person.location, lang)} · UTC−3</p>
        <h1 className="hud-name">
          Ariel <span>Grela</span>
        </h1>
        <p className="hud-title">{tr(cv.person.title, lang)}</p>
        <p className="hud-tagline">{tr(cv.person.tagline, lang)}</p>
        <ul className="hud-stats">
          {cv.stats.map((s) => (
            <li key={s.value}>
              <b>{s.value}</b>
              <span>{tr(s.label, lang)}</span>
            </li>
          ))}
        </ul>
        <CtaRow compact />
      </aside>

      <nav className="hud hud-right" aria-label={t.sources}>
        <p className="hud-kicker">{t.sources} · ROUTER</p>
        <ol className="src-list">
          {SECTIONS.map((s) => {
            const state = onAir === s.id ? 'pgm' : preview === s.id || hover === s.id ? 'pvw' : ''
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`src ${state}`}
                  onClick={() => take(s.id)}
                  onMouseEnter={() => setState({ hover: s.id })}
                  onMouseLeave={() => setState({ hover: null })}
                  onFocus={() => setState({ hover: s.id })}
                  onBlur={() => setState({ hover: null })}
                >
                  <span className="src-key">{s.key}</span>
                  <span className="src-body">
                    <span className="src-label">{tr(s.label, lang)}</span>
                    <span className="src-blurb">{tr(s.blurb, lang)}</span>
                  </span>
                  <span className="src-tag">{s.src}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="hud-hint" aria-hidden="true">
        <span className="hint-dot" /> {t.hint3d} <kbd>1</kbd>–<kbd>8</kbd> · <kbd>ESC</kbd>
      </div>
    </>
  )
}
