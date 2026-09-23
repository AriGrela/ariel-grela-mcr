import { cv, tr } from '../data/cv'
import { useT } from '../i18n'
import { SECTIONS } from '../sections'
import { setView, take, useStore } from '../store'
import { CtaRow, Timecode } from './common'

/** 2D multiviewer: used on phones, without WebGL, or when the viewer picks it. */
export default function Lite() {
  const { t, lang } = useT()
  const softwareFallback = useStore((s) => s.softwareFallback)
  return (
    <main className="lite">
      {softwareFallback && (
        <p className="notice" role="status">
          <span>{t.swNotice}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setView('mcr')}>
            {t.swTry3d}
          </button>
        </p>
      )}
      <section className="lite-pgm" aria-labelledby="lite-name">
        <div className="lite-pgm-bars" aria-hidden="true">
          {['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
        <div className="lite-pgm-top">
          <span>MCR-01 · PROGRAM</span>
          <Timecode />
        </div>
        <p className="hud-kicker">{tr(cv.person.location, lang)} · UTC−3</p>
        <h1 id="lite-name" className="hud-name">
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
        <div className="lite-umd" aria-hidden="true">
          <b>PGM</b> {lang === 'es' ? 'PROGRAMA' : 'PROGRAM'}
        </div>
      </section>

      <nav className="lite-grid" aria-label={t.sources}>
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className={`tile tile-${s.id}`} style={{ ['--accent' as string]: s.accent }} onClick={() => take(s.id)}>
            <span className="tile-screen" aria-hidden="true">
              <span className="tile-src">{s.src}</span>
            </span>
            <span className="tile-umd">
              <b>{s.key}</b>
              <span className="tile-label">{tr(s.label, lang)}</span>
            </span>
            <span className="tile-blurb">{tr(s.blurb, lang)}</span>
          </button>
        ))}
      </nav>
      <p className="lite-foot">{t.footer}</p>
    </main>
  )
}
